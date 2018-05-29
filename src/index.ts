import neo4j from 'neo4j-driver'


export interface IHelperConfig {
	driver?: neo4j.Driver
	parseIntegers?: boolean
	rawResults?: boolean
}

export default class CypherHelper {
	config: IHelperConfig = {
		driver: null,
		parseIntegers: false,
		rawResults: false,
	}

	constructor(config: IHelperConfig = {}) {
		this.config = {parseIntegers: false, ...config}
	}

	query = (strings: TemplateStringsArray, ...params: any[]): CypherQuery => {
		return new CypherQuery(this.config, strings, params)
	}
}

export class CypherQuery {
	constructor(
		protected config: IHelperConfig,
		protected strings: TemplateStringsArray,
		protected params: any[] = [],
	) {}

	export(prefix: string = 'p'): [string, any] {
		let query = ''
		let params = {} as any

		for (let i = 0, l = this.strings.length; i < l; i++) {
			const name = `${prefix}_${i}`
			const param = this.params[i]

			query += this.strings[i]

			if (param instanceof CypherQuery) {
				const [subQuery, subParams] = param.export(name)
				query += subQuery
				params = {...params, ...subParams}
			} else if (param !== undefined) {
				query += `{${name}}`
				params[name] = param
			}
		}

		return [
			query,
			params,
		]
	}

	async run<T extends Object = any>(config: IHelperConfig = {}): Promise<any> {
		const {driver, parseIntegers, rawResults} = {...this.config, ...config}
		const session = driver.session()
		const [query, params] = this.export()
		const result = await session.run(query, params)

		if (rawResults) {
			return result
		}

		let data = normalizeObjects(result.records)

		if (parseIntegers) {
			data = normalizeInts(data)
		}

		session.close()

		return data
	}
}

function normalizeObjects(record: any) {
	if (!(record instanceof Object)) {
		return record
	}

	let normalized = record

	if (record.toObject !== undefined) {
		normalized = record.toObject()
	}

	if (record instanceof (neo4j.types.Node as any)) {
		normalized = record.properties
	}

	if (normalized instanceof Array) {
		normalized = normalized.map(item => normalizeObjects(item))
	} else if (normalized instanceof Object) {
		for (let key in normalized) {
			normalized[key] = normalizeObjects(normalized[key])
		}
	}

	return normalized
}

function normalizeInts(record: any) {
	let normalized = record

	if (neo4j.isInt(record)) {
		const i = neo4j.integer
		normalized = i.inSafeRange(record) ? i.toNumber(record) : i.toString(record)
	} else if (record instanceof Array) {
		normalized = record.map(item => normalizeInts(item))
	} else if (record instanceof Object) {
		for (let key in record) {
			normalized[key] = normalizeInts(record[key])
		}
	}

	return normalized
}