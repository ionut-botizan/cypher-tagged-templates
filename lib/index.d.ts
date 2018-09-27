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
export declare class DangerousTextErr extends Error {
}
export default class CypherHelper {
    query: Query;
    config: IHelperConfig;
    constructor(config?: IHelperConfig);
}
/**
 * Don't export this they can use nested cypher``
 * statements for static text or various helpers to get dynamic text
 * like cypher.label, cypher.id, and cypher.prop.
 */
declare class CypherRawText {
    text: string;
    constructor(text: string);
}
export declare class CypherQuery {
    protected config: IHelperConfig;
    protected strings: TemplateStringsArray;
    protected params: any[];
    constructor(config: IHelperConfig, strings: TemplateStringsArray, params?: any[]);
    export(prefix?: string): [string, any];
    run<T extends Object = any>(config?: IHelperConfig): Promise<any>;
}
export {};
