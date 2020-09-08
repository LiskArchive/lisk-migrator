import { defaultAccountSchema } from '../../../src/utils/schema';

describe('utils/schema', () => {
	describe('defaultAccountSchema', () => {
		it('should match the snapshot', () => {
			expect(defaultAccountSchema).toMatchSnapshot();
		});
	});
});
