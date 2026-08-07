import { versionService } from './services/version.service';

describe('Version', () => {
  it('expone la versión de la aplicación', () => {
    expect(versionService.getVersion()).toBe('1.2.2');
  });
});
