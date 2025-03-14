import path from 'path';
import { glob } from 'glob';
import dirGlob from 'dir-glob';
import { concat } from 'lodash';

class PathUtils {
    public static resolvePath(filePath: string): string {
        return (path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)).split(path.sep).join('/');
    }

    public static getNormalizeFiles(folder: string, ignores: string[] = []): string[] {
        const correctFilesPathList: string[] = dirGlob.sync(PathUtils.resolvePath(folder), {
            extensions: [ 'html', 'ts', 'json', 'js']
        });
        const correctIgnorePath: string[] = ignores.map((path: string) => PathUtils.resolvePath(path.trim()));

        const result: string[] = correctFilesPathList.reduce((acum: string[], path: string) => {
            const filesPathList: string[] = glob.sync(path, {
                ignore: correctIgnorePath,
            });
            acum = concat(acum, filesPathList);
            return acum;
        }, []);
        return result.map((filePath: string) => {
            return path.normalize(filePath);
        });
    }
}

export { PathUtils };
