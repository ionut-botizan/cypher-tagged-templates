import neo4j from "neo4j-driver";

export interface IHelperConfig {
	driver?: neo4j.Driver;
	parseIntegers?: boolean;
	rawResults?: boolean;
}

interface FromProps {
	(propsWhitelist: [string], object: object): CypherQuery;
}

interface Raw {
	(strings: TemplateStringsArray, ...params: any[]): CypherRawText;
}

interface Query {
	(strings: TemplateStringsArray, ...params: any[]): CypherQuery;
	raw: Raw;
	fromProps: FromProps;
}

export class DangerousTextErr extends Error {}

export default class CypherHelper {
	query: Query = Object.assign(
		(strings: TemplateStringsArray, ...params: any[]): CypherQuery => {
			return new CypherQuery(this.config, strings, params);
		},
		{
			/**
			 *
			 */
			raw: (
				strings: TemplateStringsArray,
				...params: any[]
			): CypherRawText => {
				if (params.some(name => !/^\w+$/.test(name))) {
					throw new DangerousTextErr(
						"raw text can only have interpolated values that resolve to alphanumerics and/or underscores"
					);
				}
				return new CypherRawText(
					strings.reduce((accumulator, string, i, arr) => {
						if (i === arr.length - 1) {
							return accumulator + string;
						} else {
							return accumulator + string + params[i];
						}
					}, "")
				);
			},
			/**
			 * Plucks whitelisted keys and values and inserts them
			 * as key value pairs seperated by commas, so that they
			 * can be inserted into a Cypher query object.
			 * @param propsWhitelist
			 * an array of properties to whitelist from the `object`
			 * @param object
			 * object to be whitelisted
			 *
			 * @example
			 *  cql`MATCH (m:Movie:NewRelease {${cql.fromProps(
			 * 	["title", "release"],
			 * 	{title: "Bee Movie", release: new Date().toString()}
			 * )}}) RETURN m`
			 */
			fromProps: function(
				propsWhitelist: [string],
				object: object
			): CypherQuery {
				return this`${propsWhitelist
					.map((prop: string, i: number, arr: [string]) => {
						if (i === arr.length - 1) {
							return [this.raw`${prop}: `, object[prop]];
						} else {
							return [
								this.raw`${prop}: `,
								object[prop],
								this.raw`, `
							];
						}
					})
					.reduce((a, b) => a.concat(b), [])}`;
			}
		}
	);

	config: IHelperConfig = {
		driver: null,
		parseIntegers: false,
		rawResults: false
	};

	constructor(config: IHelperConfig = {}) {
		this.config = { parseIntegers: false, ...config };
		this.query.bind(this);
		this.query.fromProps.bind(this.query);
	}
}

/**
 * Don't export this they can use nested cypher``
 * statements for static text or various helpers to get dynamic text
 * like cypher.label, cypher.id, and cypher.prop.
 */
class CypherRawText {
	text: string = "";

	constructor(text: string) {
		this.text = text;
	}
}

export class CypherQuery {
	constructor(
		protected config: IHelperConfig,
		protected strings: TemplateStringsArray,
		protected params: any[] = []
	) {}

	export(prefix: string = "p"): [string, any] {
		let query = "";
		let params = {} as any;

		for (let i = 0, l = this.strings.length; i < l; i++) {
			const name = `${prefix}_${i}`;
			const param = this.params[i];

			query += this.strings[i];

			let done = false;
			const acceptParam = (param, name) => {
				if (param instanceof CypherQuery) {
					const [subQuery, subParams] = param.export(name);
					query += subQuery;
					params = { ...params, ...subParams };
				} else if (Array.isArray(param)) {
					for (let j = 0; j < param.length; ++j) {
						acceptParam(param[j], `${name}_${j}`);
					}
				} else if (param instanceof CypherRawText) {
					query += `${param.text}`;
				} else if (param !== undefined) {
					query += `{${name}}`;
					params[name] = param;
				}
			};
			acceptParam(param, name);
		}

		return [query, params];
	}

	async run<T extends Object = any>(
		config: IHelperConfig = {}
	): Promise<any> {
		const { driver, parseIntegers, rawResults } = {
			...this.config,
			...config
		};
		const session = driver.session();
		const [query, params] = this.export();
		const result = await session.run(query, params);

		if (rawResults) {
			return result;
		}

		let data = normalizeObjects(result.records);

		if (parseIntegers) {
			data = normalizeInts(data);
		}

		session.close();

		return data;
	}
}

function normalizeObjects(record: any) {
	if (!(record instanceof Object)) {
		return record;
	}

	let normalized = record;

	if (record.toObject !== undefined) {
		normalized = record.toObject();
	}

	if (record instanceof (neo4j.types.Node as any)) {
		normalized = record.properties;
	}

	if (normalized instanceof Array) {
		normalized = normalized.map(item => normalizeObjects(item));
	} else if (normalized instanceof Object) {
		for (let key in normalized) {
			normalized[key] = normalizeObjects(normalized[key]);
		}
	}

	return normalized;
}

function normalizeInts(record: any) {
	let normalized = record;

	if (neo4j.isInt(record)) {
		const i = neo4j.integer;
		normalized = i.inSafeRange(record)
			? i.toNumber(record)
			: i.toString(record);
	} else if (record instanceof Array) {
		normalized = record.map(item => normalizeInts(item));
	} else if (record instanceof Object) {
		for (let key in record) {
			normalized[key] = normalizeInts(record[key]);
		}
	}

	return normalized;
}
