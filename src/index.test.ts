import { BazelStackVSCodeAPI } from '.';
export { ProblemMatcherTest, ProblemMatcherTestRunner } from '../src/test/problemMatcherTestRunner';

describe('registerProblemMatchers', () => {
	it('should call registration API function', () => {
		const MockAPI = jest.fn<BazelStackVSCodeAPI, any[]>(() => ({
			registerProblemMatchers: jest.fn(),
		}));
		const api = new MockAPI();
		expect(api).toBeDefined();
		// todo: mock the vscode extension context
	});

});
