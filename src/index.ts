import neo4j from 'neo4j-driver'


export default class CypherHelper {
	constructor(public driver: neo4j.Driver) {}

	query = (strings: string[], ...params: any[]) => {
		return new Query(this.driver, strings, params)
	}
}

export class Query {
	constructor(
		protected driver: neo4j.Driver,
		protected strings: string[],
		protected params: any[] = [],
	) {}

	export(prefix: string = 'p'): [string, any] {
		let query = ''
		let params = {} as any

		for (let i = 0, l = this.strings.length; i < l; i++) {
			const name = `${prefix}_${i}`
			const param = this.params[i]

			query += this.strings[i]

			if (param instanceof Query) {
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

	async run(): Promise<neo4j.StatementResult> {
		const session = this.driver.session()
		const [query, params] = this.export()

		return session.run(query, params).then(result => {
			session.close()

			return result
		})
	}
}
