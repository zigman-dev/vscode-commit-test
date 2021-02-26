//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import vscode from 'vscode';
import * as scm from './scm'

export { Type } from './scm';

//------------------------------------------------------------------------------
//  types
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  functions
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export async function selectFolder(
    scmType: scm.Type | null = null
): Promise<scm.Scm | null> {

    // FIXME: Rewrite with filter/map
    let scmWorkspaces: scm.Scm[] = [];
    for (let folder of vscode.workspace.workspaceFolders || []) {
        let scmWorkspace = await scm.getScmWorkspace(folder);
        if (scmType == null || scmWorkspace.type == scmType)
            scmWorkspaces.push(scmWorkspace);
    }

    if (scmWorkspaces.length == 0)
        return null;

    let scmWorkspace = scmWorkspaces[0];
    if (scmWorkspaces.length > 1) {
        let pick = await vscode.window.showQuickPick(
            scmWorkspaces.map(wc => {
                return {
                    label: wc.folder.name,
                    scmWorkspace: wc
                }
            }),
            { placeHolder: "Pick a folder" }
        );
        if (!pick)
            return null
        scmWorkspace = pick.scmWorkspace;
    }

    return scmWorkspace;
}

//------------------------------------------------------------------------------
export async function selectChangelist(scmWorkspace: scm.Scm): Promise<string | null> {
    let changelists = await scmWorkspace.getChangelists();
    let changelist: string | null = null;
    if (changelists.length > 0) {
        let pick = await vscode.window.showQuickPick(
            changelists,
            { placeHolder: "Pick a changelist" }
        );
        if (pick)
            changelist = pick;
    }
    return changelist;
}
