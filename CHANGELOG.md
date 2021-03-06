# Change Log

## [Unreleased]

## [0.0.5] - 2021-03-06

### Fixed

*   TBD

## [0.0.4] - 2021-03-05

### Fixed

*   Fix changelist listing while there's only 0 or 1 existing

## [0.0.3] - 2021-03-02

### Added

*   Command "Submit Pre-Commit-Test for Cooper"

### Features

*   Update icons

## [0.0.2] - 2021-02-17

### Added

*   Commands issued from source control view
    *   "Submit Commit for Changelist"
    *   "Get Ticket for Changelist"
        *   Accessible while ticket is available

## [0.0.1] - 2021-02-04

### Added

*   Command "Verify Environment"
*   Command "Submit Commit-Test"
    *   Detect and let user select folders being valid `svn` workspace from
        multi-root workspace
    *   Let user select changelist to submit commit-test for
    *   Status update
        *   URL of the submitted build
        *   Live logging on output window
        *   Retrieve ticket on completion
