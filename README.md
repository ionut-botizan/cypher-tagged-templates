# cypher-tagged-templates
A tiny helper for writing and running Cypher queries using Javascript tagged templates.

### Basic example
It supports variables interpolation, automatically using the Neo4j driver to escape values.

```javascript
const neo4j = require('neo4j-driver').v1
const Cypher = require('cypher-tagged-templates').default


const driver = neo4j.driver('bolt://...', neo4j.auth.basic('neo4j', 'pass'))
const cypher = new Cypher(driver).query

const email = 'anna@example.com'
const query = cypher`
	MATCH (user:User {email: ${email}}) RETURN user
`

const result = query.run().then(result => {
	console.log(result.records[0].get('user').properties)
})

// at some point
// driver.close()
```

### Nested queries
You can also nest subqueries as variables.

```javascript
// ...setup

const email = 'anna@example.com'
const selectDb = cypher`MATCH (neo:Database {name: "Neo4j"})`
const selectPerson = cypher`MATCH (anna:Person {email: ${email}})`
const createFriend = cypher`
	CREATE (anna)
		-[:FRIEND]->(:Person:Expert {name:"Amanda"})
		-[:WORKED_WITH]->(neo)
`

const mainQuery = cypher`
	${selectDb}
	${selectPerson}
	${createFriend}
`

const result = mainQuery.run().then(result => {
	console.log(result.records)
})
```

### Manual queries
Instead of directly runing the queries, you can export them as a string and a parameters object so you can execute them yourself (E.g. execute multiple queries as part of a transaction).

```javascript
// ...setup

const email = 'anna@example.com'
const status = 'active'
const findUser = cypher`
	MATCH (user:User {email: ${email}})
	WHERE status = ${status}
	RETURN user
`

const [query, params] = findUser.export()

/*
query = 'MATCH (user:User {email: {p_0}}) WHERE status = {p_1} RETURN user'
params = {
	p_0: 'anna@example.com',
	p_1: 'active'
}
*/
```