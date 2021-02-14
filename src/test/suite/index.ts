import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import { resetConfiguration } from "./util/configuration";
import { openDocument, sleep, Test_Md_File_Path } from "./util/generic";

export async function run(): Promise<void> {
	// Let VS Code load the test workspace.
	await openDocument(Test_Md_File_Path);
	await sleep(2000);
	await resetConfiguration();

	// Create the mocha test
	const mocha = new Mocha({
		color: true,
		ui: 'tdd',
	});

	// Load the test suite.
	const testSuiteRoot = path.resolve(__dirname);
	const globOptions: glob.IOptions = { cwd: testSuiteRoot };

	const unitTests = glob.sync("unit/**/*.test.js", globOptions);
	const integrationTests = glob.sync("integration/**/*.test.js", globOptions);

	unitTests.forEach(f => mocha.addFile(path.resolve(testSuiteRoot, f))); // Run unit tests first.
	integrationTests.forEach(f => mocha.addFile(path.resolve(testSuiteRoot, f)));

	// Run tests.
	return new Promise<void>((resolve, reject): void => {
		try {
			mocha.run(failures => {
				// Ensure the control returns only after tests finished.
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				}
				resolve();
			});
		} catch (err) {
			console.error(err); // https://github.com/microsoft/vscode/issues/80757
			throw err;
		}
	});
}
