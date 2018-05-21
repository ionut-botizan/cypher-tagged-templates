import neo4j from 'neo4j-driver';
export default class CypherHelper {
    driver: neo4j.Driver;
    constructor(driver: neo4j.Driver);
    query: (strings: string[], ...params: any[]) => Query;
}
export declare class Query {
    protected driver: neo4j.Driver;
    protected strings: string[];
    protected params: any[];
    constructor(driver: neo4j.Driver, strings: string[], params?: any[]);
    export(prefix?: string): [string, any];
    run(): Promise<neo4j.StatementResult>;
}
