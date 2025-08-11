# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2024-12-19

### Fixed
- Added comprehensive error handling and debugging to browser initialization process
- Implemented timeout mechanism to prevent browser initialization from hanging indefinitely
- Enhanced Chrome DevTools Protocol connection error handling
- Added detailed logging throughout the browser initialization process

### Technical Improvements
- Added 30-second timeout for browser initialization to prevent hanging
- Enhanced error messages with specific failure reasons
- Added step-by-step logging in browser initialization
- Improved CDP connection error handling with clear error messages
- Added connection status verification after browser initialization

## [0.0.4] - 2024-12-19

### Enhanced
- Added comprehensive debugging and logging to MetaMask notification detection
- Improved notification page element detection with alternative selectors
- Enhanced `acceptAccess` function with detailed logging for better troubleshooting
- Increased retry wait time for notification detection from 200ms to 500ms
- Added page URL logging to help identify notification window issues

### Debugging Improvements
- Added detailed logging in `switchToMetamaskNotification` function
- Added alternative selector detection for notification content
- Enhanced error handling with more informative messages
- Added step-by-step logging in `acceptAccess` function

## [0.0.3] - 2024-12-19

### Fixed
- Fixed browser initialization issue in MetaMask commands
- Added auto-initialization of browser when not already initialized
- Enhanced error handling in `getExtensionsData`, `metamaskExtensionId`, `switchToMetamaskNotification`, and `assignWindows` functions
- Added comprehensive browser state validation before executing MetaMask operations
- Improved error messages and logging for better debugging

### Technical Improvements
- Added browser initialization checks in all critical Playwright functions
- Implemented graceful fallback mechanism for browser initialization
- Enhanced error propagation with detailed logging
- Added try-catch blocks around browser-dependent operations

## [0.0.2] - 2024-12-19

### Fixed
- Fixed `TypeError: Cannot read properties of undefined (reading 'id')` error in `metamaskExtensionId` function
- Enhanced error handling in Playwright commands for better MetaMask extension detection
- Added retry mechanism for extension detection to handle timing issues
- Improved robustness of `getExtensionsData` function with better validation and error handling
- Added comprehensive logging for debugging extension detection issues

### Changed
- Updated author to "gracefnr"
- Enhanced error messages to provide better debugging information

### Technical Improvements
- Added browser initialization validation in `getExtensionsData`
- Added element existence checks before extracting extension data
- Implemented fallback mechanism for extension detection
- Added detailed logging throughout the extension detection process

## [0.0.33] - Previous version

Initial release with basic MetaMask integration support. 