import { exec } from 'child_process';

export const execAsync = async (cmd: string): Promise<string> =>
	new Promise((resolve, reject) => {
		exec(cmd, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);
		});
	});
