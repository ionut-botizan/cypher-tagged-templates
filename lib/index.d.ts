import neo4j from 'neo4j-driver';
export interface IHelperConfig {
    driver?: neo4j.Driver;
    parseIntegers?: boolean;
    rawResults?: boolean;
}
export default class CypherHelper {
    config: IHelperConfig;
    constructor(config?: IHelperConfig);
    query: (strings: TemplateStringsArray, ...params: any[]) => CypherQuery;
}
export declare class CypherQuery {
    protected config: IHelperConfig;
    protected strings: TemplateStringsArray;
    protected params: any[];
    constructor(config: IHelperConfig, strings: TemplateStringsArray, params?: any[]);
    export(prefix?: string): [string, any];
    run<T extends Object = any>(config?: IHelperConfig): Promise<any>;
}
