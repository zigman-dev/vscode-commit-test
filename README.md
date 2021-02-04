# commit-test

[cmgk](http://172.26.6.129/scm/cmgk.git) commit-test client for VSCode,
which submits test to [Jenkins](http://172.26.6.130:8080/mainline/commit_test),
is an alternative to the original command-line based client, which submit test
to the legacy [celeryd service](amqp://cmgk@172.26.6.130).

## Features

*   Support multi-root VSCode workspace
    *   Let user select a folder with valid `svn` workspace among those detected
*   Support `svn` changelist
    *   Let user select a changelist (or default) to submit test for
*   Status update
    *   Live Jenkins logging on a dedicated output window
    *   Retrieve ticket on completion

## Extension Settings

```json
{
    // Valid account which can login to the Jenkins service (usually your NT account), mandatory
    "commi-test.jenkins.account.user": "your.name",
    "commi-test.jenkins.account.password": "password",

    // Mail address to send notification to, optional
    "commi-test.jenkins.account.mail": "your.mail@realtek.com",

    // Jenkins host and job to submit test to, optional and default to the following value.
    // Do not change these unless you know what you are doing.
    "commi-test.jenkins.hostAddress": "http://172.26.6.130:8080",
    "commi-test.jenkins.jobName": "mainline/commit_test"
}
```

## Known Issues

TBD

## Release Notes

See [CHANGELOG.md](CHANGELOG.md)
