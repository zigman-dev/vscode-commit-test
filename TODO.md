# TODO

## Integration

*   [ ] Publish
    *   [ ] with public or private registry
    *   [x] In modem mainline documentation
*   [ ] Logging
*   [x] Username/password
*   [ ] ~~Fold `contributes.configuration` in `package.json`~~
    *   Not supported

## Functionalities

*   [x] Pre-commit
    *   [x] Parameters configuration
    *   [ ] Revision selection
        *   Integrate with vscode scm
*   [ ] Commit

### Machanism

*   [x] Get ticket directly
*   [x] Submit diff without saving diff as file
*   [ ] Replace npm `jenkins` with pure HTTP module
*   [x] Support changelist
*   [ ] Sessions
    *   [ ] Start from exclusive
    *   [ ] Support stop/terminate
    *   [ ] Multiple sessions
*   Invalidate ticket
    *   [x] On file change
    *   [x] On changelist change
*   `commit_test` for branches
    *   [x] Warn if the branch is not seen in the jenkins multi-branch pipeline

### UI

*   [ ] Progress update
*   [x] Select files/folders to submit
*   [ ] Keyboard shortcut
*   [x] Display build logging
*   [ ] Display build activeness
*   [x] Provide command access via scm panel
*   [x] Indicate ticket availability
*   [ ] Colorize build logging
