# Wireframe Generator 3.x

A collection of scripts to generate 3.x wireframing files. A proper UI will eventually come

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Make sure to install all packages in the package.json

### Installing

Clone repo, then run npm install.

## Using the Scripts

### generate-fields.js

Generates the index.js, options.picklist.js, along with any picklist.json. Supports creation of child docs and custom child docs. Custom child docs will also generate the appropriate related files.
Paste input in the 'fields.txt'. Columns are separated by TABS, similar to when pasting from an Excel file into a text editor. Format is as follows:

Field Name | Type | TypeOptions (Picklists, Radios)
--- | --- | ---
Counsel Name | Text Box
Assistance Program | Radio Button | Yes, No
Date Amber Alert Filed | Date Picker
Alcohol Involved | Radio Button | Yes, No, Unknown
Drugs Involved | Radio Button | Yes, No, Unknown
Union Involved | Dropdown | Union A, Union B, Union C
Grievance Type | Dropdown | Contract, Overtime, Workplace Conditions, Discrimination, Conflict, Other
Other Grievance Type | Text Box

Run node generate-fields.js [optionalName, customFlag]

Script will default to creating a case entity. In order to specify otherwise, use arguments.

Example:
node generate-fields.js party
node generate-fields.js interview custom


### generate-forms.js

Generates the form.js, rules.js, and validation.js
Paste input in the 'form.txt' file. Columns are separated by TABS, similar to when pasting from an Excel file into a text editor. Format is as follows:

Field Name | Type | TypeOptions (Picklists, Radios)
--- | --- | ---
Counsel Name | Legal Involved = Yes | Legal Involved = Yes
Assistance Program | Case Type = Alcohol/Drugs OR Substance Abuse | Case Type = Alcohol/Drugs OR Substance Abuse
Date Amber Alert Filed | Amber Alert Filed = Yes | Amber Alert Filed = Yes
Alcohol Involved | Case Type = Assault | Case Type = Assault
Drugs Involved | Case Type = Assault | Case Type = Assault
Union Involved | Sub Case Type = Union | Case Type = Grievance &#124&;#124; Sub Case Type = Union
Grievance Type |  | Case Type = Grievance &#124&;#124; Sub Case Type = Union
Other Grievance Type  | Grievance Type = Other | Grievance Type = Other

Run node generate-form.js [optionalName]

Script will default to creating a case-capture form. In order to specify otherwise, use arguments.

Example:
node generate-form.js case-overview
node generate-form.js party-details


### generate-picklist.js

Generates the picklists along with any parents, generating proper dependencies. Also generates the options.picklist.js
Paste input in the 'picklist.txt' file. Columns are separated by TABS, similar to when pasting from an Excel file into a text editor. Format is as follows:

Department | Case Type | Sub Case Type
--- | --- | ---
Complaints | Admissions
Complaints | Cafeteria | Food Quality, Cleanliness, Staff, Allergies, Religious Accomodation, Selection, Temperature, Wait Time
Complaints | Campus Programs
Complaints | Financial Aid
Complaints | Parking Administration
Complaints | Student Life | Accomodation, Extra Curricular, Athletics, Campus Store, Bullying, Discrimination
Employee Relations | Grievance
Employee Relations | Attendance | Late Arrivals, Unscheduled Absense
Employee Relations | Compensation
Employee Relations | Discrimination | Age, Citizen Status, Disability, Gender, Gender Identity, National Origin, Pregnancy, Race, Religion, Sex, Sexual Orientation, Veteran status, Ethnicity, Medical History, Other

Run node generate-picklist.js