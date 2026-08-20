import { classifyCommand, classifyFilePath } from "./policy.mjs";

let input = "";
for await (const chunk of process.stdin) {
	input += chunk;
}

try {
	const event = JSON.parse(input);
	let result = { decision: "allow" };

	if (event.tool_name === "Bash") {
		result = classifyCommand(String(event.tool_input?.command ?? ""));
	} else {
		const filePath = event.tool_input?.file_path ?? event.tool_input?.notebook_path;
		if (typeof filePath === "string") {
			result = classifyFilePath(filePath, event.cwd ?? process.cwd());
		}
	}

	if (result.decision !== "allow") {
		process.stdout.write(JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: result.decision,
				permissionDecisionReason: result.reason,
			},
		}));
	}
} catch (error) {
	console.error(`Claude guard could not parse hook input: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 2;
}
