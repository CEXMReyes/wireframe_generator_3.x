var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var configGen = require('./config.js');
var formName = process.argv[2] ? process.argv[2] : 'case-capture';
var entityName = formName.split('-').slice(0,-1).join('-');
var isTab = process.argv[3] === 'tab';

// Run
if(isTab) {
	fs.readdir(configGen.customTabsDir, function(err, files) {
		if(err) console.error(err);
		_.forEach(files, function(file) {
			fs.readFile(path.join(configGen.customTabsDir, file), 'utf8', function (err, data) {
				if (err) console.error(err);
				writeToFile(file.replace('tab-name', formName), replaceTabName(data), configGen.customTabFilesPaths[file]);
			});
		});
	});
}

fs.readFile(path.join(configGen.inDir, 'form.txt'), 'utf8', function (err, data) {
	if (err) console.error(err);
	var input =  _.map(data.split('\n'), function (item) {
		return item.split('\t');
	});
	writeToFile(formName + '-form.js', generateForm(input), path.join('config', 'form-layouts'));
	writeToFile('rules.js', rules, path.join('entities', _.camelCase(entityName).toLowerCase()));
	writeToFile('validation.js', validation, path.join('entities', _.camelCase(entityName).toLowerCase()));
});

// Variables
var formDefaults = _.cloneDeep(require('./defaults/form-defaults.js'));
var validation = { mandatory$: [], dependentMandatory$: [] };
var rules = {};

// Functions
function generateForm(listOfLists) {
	if(_.includes(formName, 'case')) addValidation('closeReason', 'isClosed');
	if(!_.includes(formName, 'case')) addValidation('caseId', '*');
	var section;
	var isSection = false;
	var output = _.reduce(listOfLists, function (acc, list) {
		if(_.includes(list[0], '###')) {
			section = { type: 'section' };
			section.caption = _.snakeCase(list[0].split('###'));
			section.elements = [];
			isSection = true;
			return acc;
		}
		if(_.includes(list[0], '##')) {
			isSection = false;
			acc.push(section);
			return acc;
		}

		var field = { field: _.camelCase(list[0]) };

		if(list[1]) addValidation(field.field, handleRule(list[1]));
		if(list[2]) field.displayRule = handleRule(list[2]);

		if(isSection) {
			section.elements.push(field);
		} else {
			acc.push(field);
		}

		return acc;
	}, []);

	if(formName === 'case-overview') {
		output = formDefaults.caseOverviewHeader
			.concat(output)
			.concat(formDefaults.caseOverviewFooter);
	} else if(!_.includes(formName, 'case')) {
		output = formDefaults.childHeader.concat(output);
		if(formName === 'party-details') output[0].typeOptions = formDefaults.partyTypeOptions;
	}
	return { elements: output };
}

function generateRules(data) {
	if(data === '*') return '*';
	var ruleList = data.split('=');
	var displayRule = _.map(ruleList[1].split('OR'), function(value) {
		var rule = _.camelCase(ruleList[0] + ' is ' + value);
		addRule(ruleList[0], rule, value);
		return rule;
	});
	return displayRule.join(' || ');
}

function addRule(field, rule, value) {
	rules[rule] =  rules[rule] ?
		rules[rule] :
		{ function_header: _.camelCase(field) + ' === \'' + value.trim() + '\';' };
}

function addValidation(childField, displayRule) {
	if(displayRule === '*') {
		if(!_.includes(validation.mandatory$, childField)) validation.mandatory$.push(childField);
	} else {
		var conditionExists = false;
		_.forEach(validation.dependentMandatory$, function(item, key) {
			if(item.condition === displayRule) {
				conditionExists = true;
				if(!_.includes(validation.dependentMandatory$[key].fields, childField)) {
					validation.dependentMandatory$[key].fields.push(childField);
				}
				return false;
			}
		});
		if(!conditionExists) validation.dependentMandatory$.push({ condition: displayRule, fields: [childField] });
	}
}

function handleRule(data) {
	var multiRules = _.map(data.split('||'), function(item) {
		return _.includes(item, '&&') ? _.map(item.split('&&'), function(innerItem) {
			return generateRules(innerItem);
		}) : generateRules(item);
	});
	return multiRules.join(' || ').replace(/,/g, ' && ');
}

function rulesFormat(data) {
	return JSON.stringify(data, null, '\t')
		.replace(/: {/g, ": function (data) {")
		.replace(/function_header_truthy/g, "return !!data.")
		.replace(/function_header_confidential/g, "return ")
		.replace(/function_header/g, "return data.")
		.replace(/"/g, "")
		.replace(/data.: /g, "data.")
		.replace(/return : /g, "return ")
		.replace(/&& /g, "&&\n\t\t\t")
		.replace(/\|\| /g, "||\n\t\t\t")
		.replace(/canViewConfidential: function \(data\) {/g,
			"canViewConfidential: function () {");
}

function formFormat(data) {
	return JSON.stringify(data, null, '\t')
		.replace(/\"([^(\")"]+)\":/g,"$1:")
		.replace(/"/g, "'");
}

function replaceTabName(data) {
	var halfName = formName.replace(/case-/g, '');
	return data
	.replace(/tab-name/g, formName)
	.replace(/tabName/g, _.camelCase(formName))
	.replace(/tab_name/g, _.snakeCase(formName))
	.replace(/TabName/g, _.upperFirst(_.camelCase(formName)))
	.replace(/half-name/g, halfName)
	.replace(/halfName/g, _.camelCase(halfName))
	.replace(/half_name/g, _.snakeCase(halfName))
	.replace(/HalfName/g, _.upperFirst(_.camelCase(halfName)));
}

function writeToFile(fileName, content, filepath) {
	var baseDir = configGen.pathOn ? configGen.projDir : configGen.outDir;
	createFolderPath(filepath, baseDir);

	var file = fs.createWriteStream(path.join(baseDir, filepath, fileName));

	var output = 'module.exports = ';
	if(_.includes(fileName, 'form.js')) {
		if(formName === 'case-capture') content.elements = content.elements.concat(formDefaults.caseCaptureFooter);
		if(formName === 'case-resolution') content.elements = content.elements.concat(formDefaults.caseResolutionFooter);
		output += formFormat(_.assign({ name: formName }, content)) + ';';
	} else if(fileName == 'rules.js') {
		if(_.includes(formName, 'case')) {
			output = '/* global $appData */\n\n' + output;
			content = _.defaults(content, formDefaults.caseRulesDefaults);
		}
		output += rulesFormat(content) + ';';
	} else if(fileName == 'validation.js') {
		output += formFormat(content) + ';';
	} else {
		output = content;
	}
	file.write(output, 'utf8', function(err, data) {
		if(err) console.error(err);
		file.end();
	});
}

function createFolderPath(targetPath, baseDir) {
	var folders = _.filter(targetPath.split(path.sep), function(item) {
		return !_.includes(item, '.');
	});

	_.reduce(folders, function(newPath, item) {
		newPath = path.join(newPath, item);
		if(!fs.existsSync(newPath)) { fs.mkdirSync(newPath); }
		return newPath;
	}, baseDir);
}