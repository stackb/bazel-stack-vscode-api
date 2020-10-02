import path = require('path');
import * as vscode from 'vscode';
import { extensionContributionSection, extensionId as bazelStackVscodeExtensionId, problemMatchersContributionSection } from './constants';
import { Config } from './problemMatcher';
import { isArray, isObject, isUndefined } from './types';
export * from './problemMatcher';

/**
 * This is the interface offered by the bazel-stack-vscode extension for
 * registering and unregistering capabilities.
 */
export interface BazelStackVSCodeAPI {
	/**
	 * Contributes the given list of named problems matcher configurations.
	 * @param configs Named problem matchers to contribute.
	 * @return A Disposable that unregisters this provider when being disposed.
	 */
	registerProblemMatchers(configs: Config.NamedProblemMatcher[]): vscode.Disposable;
}

/**
 * registerProblemMatchers is a convenience function that extracts named problem
 * matchers from an extension and registers them into the bazel-stack-vscode
 * extension. If the operation fails, the promise will reject with an Error.
 *
 * @param context the extension providing the problem matchers.  These are
 * expected to be in the package.json of the extension at
 * `{"bazel-stack-vscode": { "problemMatchers": [...] } }`
 */
export function registerProblemMatchers(context: vscode.ExtensionContext) {

	const api = vscode.extensions.getExtension<BazelStackVSCodeAPI>(bazelStackVscodeExtensionId);
	if (isUndefined(api)) {
		throw new Error(
			`Extension ${bazelStackVscodeExtensionId} not found. 
			 Please ensure the extension declares an "extensionDependencies" = ["${bazelStackVscodeExtensionId}"] in the package.json`);
	}
	if (!api.isActive) {
		throw new Error(
			`Extension ${bazelStackVscodeExtensionId} is not active.
			Skipping problem matcher registration`);
	}
	
	const packageJSON = require(path.join(context.extensionPath, 'package.json'));
	const contributionSection = packageJSON[extensionContributionSection];
	if (!isObject(contributionSection)) {
		throw new Error(`the extension providing the problem matchers must have a section "${extensionContributionSection}" in the package.json`);
	}

	const problemMatchers = contributionSection[problemMatchersContributionSection];
	if (!isArray(problemMatchers)) {
		throw new Error(`the extension providing the problem matchers must have a section "${extensionContributionSection}.${problemMatchersContributionSection}" in the package.json`);
	}
	
	context.subscriptions.push(api.exports.registerProblemMatchers(problemMatchers as Config.NamedProblemMatcher[]));
}