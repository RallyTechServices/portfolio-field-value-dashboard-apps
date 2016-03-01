# portfolio-field-value-dashboard-apps
A series of apps that respond to a particular portfolio item field value on a dashboard selector

###How to use: 
Install the pfv-selector onto the desired dashboard.  
Configure the selector:  
*  Choose a portfolio item type
*  Choose a field by which to filter portfolio items.


Install other available apps onto the dashboard.  These apps will respond to the portfolio field value
selector by querying data associated with all portfolio items of the configured type that match the 
selected field value.  

* Custom Grid (pfv-custom-grid)
  - Shows all descendents (of configured type) of hte portfolio items that meet the selector criteria.  

* Kanban (pfv-kanban)
   - Shows all children portfolio item types of the portfolio items that meet the selector criteria.  
   
* Cumulative Flow (pfv-cfd)
   - Shows user story cumulative flow data for the portfolio items that meet the selector criteria.  