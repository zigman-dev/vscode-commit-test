//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import * as http from 'http';
import { URL } from 'url';

export default { download };

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
async function download(url: URL): Promise<string>{
    return await new Promise((resolve, reject) => {
        http.get(
            url,
            (response) => {
                let body = "";
                response.on('data', chunk => {
                    body += body + chunk;
                });
                response.on('end', () => resolve(body));
            }
        ).on('error', (error: Error) => reject(error));
    });
};
