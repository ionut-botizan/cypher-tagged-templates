const Cypher = require("../../lib").default;
const driverMock = require("neo4j-driver");

jest.mock("neo4j-driver", () => {
	const __sessionMock__ = {
		run: jest.fn((p1, p2) => []),
		close() {
			return;
		}
	};
	return {
		__sessionMock__,
		driver() {
			return {
				session() {
					return __sessionMock__;
				}
			};
		}
	};
});
const cypherQuery = new Cypher({
	driver: driverMock.driver("bolt://example.com:6060", "user", "pass")
}).query;

describe("Cypher", () => {
	describe(".query.export", () => {
		it("should work with simple example data", () => {
			const expectedParams = {
				title: "The Dark Knight"
			};
			const expectedString = /^MATCH \(m:Movie \{title: \{(.*?)\}\}\) RETURN m$/;

			const [
				actualString,
				actualParams
			] = cypherQuery`MATCH (m:Movie {title: ${
				expectedParams.title
			}}) RETURN m`.export();

			expect(actualString).toMatch(expectedString);
			const matches = expectedString.exec(actualString);
			expect(actualParams[matches[1]]).toEqual(expectedParams.title);
			expect(Object.values(actualParams)).toContain(expectedParams.title);
		});

		it("should work with more complex example data", () => {
			const expectedParams = {
				title: "Marvel: Infinity War",
				release: new Date().toString()
			};
			const expectedString = /^MATCH \(m:Movie:NewRelease \{title: \{(.*?)\}, release: \{(.*?)\}\}\) RETURN m$/;

			const [
				actualString,
				actualParams
			] = cypherQuery`MATCH (m:Movie:NewRelease {title: ${
				expectedParams.title
			}, release: ${expectedParams.release}}) RETURN m`.export();

			const paramValues = Object.values(actualParams);
			expect(actualString).toMatch(expectedString);
			const matches = expectedString.exec(actualString);
			expect(actualParams[matches[1]]).toEqual(expectedParams.title);
			expect(actualParams[matches[2]]).toEqual(expectedParams.release);
			expect(paramValues).toContain(expectedParams.title);
			expect(paramValues).toContain(expectedParams.release);
		});
	});

	describe(".query.run", () => {
		it("should call driver run method with proper export data", async () => {
			const params = {
				title: "The Dark Knight"
			};
			const expectedArgs = cypherQuery`MATCH (m:Movie {title: ${
				params.title
			}}) RETURN m`.export();

			await cypherQuery`MATCH (m:Movie {title: ${
				params.title
			}}) RETURN m`.run();

			expect(driverMock.__sessionMock__.run).toBeCalledTimes(1);
			expect(driverMock.__sessionMock__.run).toBeCalledWith(
				...expectedArgs
			);
		});
	});
});
