//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
let svn = require('svn-interface')

export default {is_workspace, get_changelists, get_patch};

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
// FIXME: Create a class for svn operations
async function is_workspace(wc: string): Promise<boolean> {
    let result = await new Promise<boolean>((resolve, reject) => {
        svn.info(
            wc,
            {},
            (error: Error, result: any) => {
                resolve(error == null);
            }
        )
    })
    return result;
}

//------------------------------------------------------------------------------
async function get_changelists(wc: string): Promise<string[]> {
    let diff = await new Promise<string[]>((resolve, reject) => {
        svn.status(
            wc,
            {},
            (error: Error, result: any) => {
                resolve(result.status.changelist.map(
                    (changelist: any) => changelist._attribute.name
                ))
            }
        )
    })
    return diff;
}

//------------------------------------------------------------------------------
async function get_patch(wc: string, changelist: string | null): Promise<string> {
    let options: Record<string, string | true> = {
        "patch-compatible": true
    };
    if (changelist != null)
        options["changelist"] = changelist;
    let diff = await new Promise<string>((resolve, reject) => {
        svn._execSVN(
            "diff",
            wc,
            options,
            (error: Error, result: any) => {
                resolve(result);
            }
        )
    })
    return diff;
}
