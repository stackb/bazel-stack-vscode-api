# bazel-stack-vscode API

This package contains the APIs used to interact with the
[bazel-stack-vscode](https://marketplace.visualstudio.com/items?itemName=StackBuild.bazel-stack-vscode)
extension.

The API reference documentation can be found [here](https://github.com/stackb/bazel-stack-vscode-api/blob/master/src/index.ts).

## Implementing Problem Matchers

Problem matchers can be registered with the bazel-stack-vscode extension to
extend its diagnostic capabilities.  Problem Matchers are named regular expressions
that are used to match lines in the stdout/stderr of a particular tool.
Matching results are displayed in the editor making it easy to see and navigate
to problem areas in a source file.

For example, consider the `proto_library` rule.  When a rule of this class is
executed, a `ProtoCompile` action is spawned that performs the actual work and
runs the `protoc` tool (the name `ProtoCompile` is called the *action
mnemonic*). The `protoc` tool complains about errors in a format like
`proto/example.proto:111:17: Field number 5 has already been used in
"foo.Message" by field "finished"`.

The corresponding *problem matcher* associates the mnemonic name `ProtoCompile`
with a regular expression (as well as metadata that instructs how to map the
matching parts into meaningful tokens):

```json
{
    "name": "ProtoCompile",
    "aliases": ["GenProtoDescriptorSet"],
    "fileLocation": [
        "relative",
        "${workspaceRoot}"
    ],
    "pattern": [
        {
            "regexp": "(.*):(\\d+):(\\d+): (.*)$",
            "file": 1,
            "line": 2,
            "column": 3,
            "message": 4
        }
    ],
    "examples": [
        "proto/example.proto:111:17: Field number 5 has already been used in \"foo.Message\" by field \"finished\"",
    ]
}
```

Note that the format & design of problem matchers is nearly identical to
https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher.
Please refer to that documentation for more specifics about the format.

## Creating a Problem Matcher Extension

For example, let's say you are working with haskell, and you'd like to make it
easier to find problems in `ghc` output.  Here are the steps you'd take to
create this extension:

1. Fork an existing example such as
[stackb/bazel-stack-vscode-rules_go](https://github.com/stackb/bazel-stack-vscode-go).
1. Replace the name to match the language or tool:
   `s/bazel-stack-vscode-rules-go/bazel-stack-vscode-rules-haskell/g`.
1. Delete the golang problem matchers in `package.json` and replace with your
   tool specific matchers in your `package.json`.  In order to do this properly,
   you'll need to know the mnemonic names of the actions spawned by haskell
   rules and ensure these are an exact string match (the mnemonic name of the
   action is used to find the correct problem matcher).
1. Make sure your problem matcher definitions have examples.  The examples are
   used by the problem matcher test runner.  Run the tests via `npm run test`.
   If needed, use the `negative-examples` array field for examples that should
   *not* match your regular expression.
1. [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) to the vscode marketplace.
1. Install the extension within vscode.  At extension load time, your extension
   will find the `bazel-stack-vscode` extension and populate it with your
   problem matchers.  At runtime, these problem matchers will be used to create
   tool-specific diagnostics.