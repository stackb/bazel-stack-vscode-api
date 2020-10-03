import * as assert from 'assert';
import * as fs from 'fs';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { markers, markerService, parsers, problemMatcher, strings } from 'vscode-common';


export interface ProblemMatcherTest {
	d?: string // test description
	name: string // problem matcher name
	example: string // input string
	uri?: string, // optional uri to be matched (the filename)
	markers: markers.IMarker[], // set of markers that matcheds
}


export class ProblemMatcherTestRunner {
	private registry = new problemMatcher.ProblemMatcherRegistryImpl();

	constructor(
		configs: problemMatcher.Config.NamedProblemMatcher[],
	) {
		const logger = new ConsoleProblemReporter();
		const parser = new problemMatcher.ProblemMatcherParser(this.registry, logger);

		for (const config of configs) {

			const matcher = parser.parse(config);

			if (!problemMatcher.isNamedProblemMatcher(matcher)) {
				throw new Error('not a named problem matcher');
			}
			const name = matcher.name;
			const aliases = name.split(/\s*,\s*/);
			for (const alias of aliases) {
				matcher.name = alias;
				// override any existing 'owner' such that the name and
				// owner are always equal.  This simplified retrieval of the
				// set of matched problems from the 'markerService'.
				matcher.owner = alias;
				this.registry.add(matcher);
				console.log(`Registered problem matcher "${alias}"`);
			}
		}
	}

	async testAll(cases: ProblemMatcherTest[]) {
		return Promise.all(cases.map(tc => this.test(tc)));
	}

	async test(tc: ProblemMatcherTest) {
		const data = Buffer.from(tc.example);
		const matcher = this.registry.get(tc.name);
		if (!matcher) {
			throw new Error(`matcher ${tc.name} not found`);
		}
		const mrkrs = new markerService.MarkerService();
		const problems = new Map<vscode.Uri, markers.IMarker[]>();
		await this.collectProblems(tc.name, matcher, data, mrkrs, problems);
		if (!tc.uri) {
			assert.strictEqual(problems.size, 0, 'problems.size');
			return;
		}
		
		assert.strictEqual(problems.size, 1, 'problem size');
		problems.forEach((matched, uri) => {
			assert.strictEqual(uri.toString(), tc.uri, 'uri');
			assert.strictEqual(matched.length, 1, 'markers.length');
			assert.strictEqual(matched.length, tc.markers.length);
			
			const expected = tc.markers[0];
			const actual = matched[0];
			assert.strictEqual(actual.owner, expected.owner, 'owner');
			assert.strictEqual(actual.severity, expected.severity, 'severity');
			assert.strictEqual(actual.code, expected.code, 'code');
			assert.strictEqual(actual.message, expected.message, 'message');
			assert.strictEqual(actual.source, expected.source, 'source');
			assert.strictEqual(actual.startLineNumber, expected.startLineNumber, 'startLineNumber');
			assert.strictEqual(actual.startColumn, expected.startColumn, 'startColumn');
			assert.strictEqual(actual.endLineNumber, expected.endLineNumber, 'endLineNumber');
			assert.strictEqual(actual.endColumn, expected.endColumn, 'endColumn');
		});
	}

	async collectProblems(
		owner: string,
		matcher: problemMatcher.ProblemMatcher,
		data: Buffer,
		mrkrs: markers.IMarkerService,
		problems: Map<vscode.Uri, markers.IMarker[]>,
	) {
		const decoder = new problemMatcher.LineDecoder();
		const collector = new problemMatcher.StartStopProblemCollector([matcher], mrkrs);

		const processLine = async (ln: string) =>
			collector.processLine(strings.removeAnsiEscapeCodes(ln));

		for (const ln of decoder.write(data)) {
			await processLine(ln);
		}
		let line = decoder.end();
		if (line) {
			await processLine(line);
		}

		collector.done();
		collector.dispose();

		const matched = mrkrs.read({
			owner: owner,
		});

		for (const marker of matched) {
			if (!marker.resource) {
				console.log('skipping marker without a resource?', marker);
				continue;
			}
			let items = problems.get(marker.resource);
			if (!items) {
				items = [];
				problems.set(marker.resource, items);
			}
			items.push(marker);
		}
	}

	/**
	 * Parses the package.json and builds a test runner from the
	 * 'contributes.problemMatchers' section.
	 * 
	 * @param filename The name of the package.json file
	 */
	static fromPackageJson(filename: string) {
		const data = fs.readFileSync(filename);
		const packageJSON: any = JSON.parse(data.toString());
		const configs = packageJSON.contributes.problemMatchers as problemMatcher.Config.NamedProblemMatcher[] | undefined;
		if (!Array.isArray(configs)) {
			throw new Error('expected package.json to contain an array at "contributes.problemMatchers"');
		}
		return new ProblemMatcherTestRunner(configs);
	}
}


export class ConsoleProblemReporter implements parsers.IProblemReporter {

	private _validationStatus: parsers.ValidationStatus;

	constructor() {
		this._validationStatus = new parsers.ValidationStatus();
	}

	public info(message: string): void {
		this._validationStatus.state = parsers.ValidationState.Info;
		console.info(message);
	}

	public warn(message: string): void {
		this._validationStatus.state = parsers.ValidationState.Warning;
		console.warn(message);
	}

	public error(message: string): void {
		this._validationStatus.state = parsers.ValidationState.Error;
		console.error(message);
	}

	public fatal(message: string): void {
		this._validationStatus.state = parsers.ValidationState.Fatal;
		console.error(message);
		throw new TypeError(message);
	}

	public get status(): parsers.ValidationStatus {
		return this._validationStatus;
	}
}

