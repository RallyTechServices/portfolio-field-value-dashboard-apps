#Portfolio Item Field Value Cumulative Flow

![ScreenShot](/images/cumulative-flow.png)

This app is a portfolio item cumulative flow diagram that responds to a selected field value for a configured portfolio item type.  The data set
that makes up the cumulative flow is based on the portfolio items of the configured type that match the selected criteria for the configured field.  

This app subscribes to a portfolio field value selector broadcast from any other app on the page.  

Configurations include:
*  Start Date - Determines which date to use for the start date.  Options are:  Planned Start Date, Actual Start Date or custom selected date.  
*  End Date - Determines which date to use for the end date.  Options are: Today, Planned End Date, Actual End Date or a custom selected date.
*  Data Type - determines whether or not to show the Story Plan Estimate or Story count on the Y-Axis

Becuase this app could be returning data for multiple portfolio items the earliest planned start or actual start date is used and the latest planned end or actual end
date is used for the timebox.  

Note that if items are outside the scope of the selected project or the user's permissions, then the stories will not be included in the cumulative flow.  


## Development Notes

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  Server is only used for debug,
  name, className and sdk are used for both.
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to run the
  slow test specs.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.
