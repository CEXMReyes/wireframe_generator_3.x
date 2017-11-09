var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var pluralize = require('pluralize');
var inDir = './input/';
var outDir = './output/';
var customDir = './custom-forms/';
var entityName = process.argv[2] ? process.argv[2] : 'case';
var isCustom = process.argv[3] === 'custom';

// Run
if(isCustom) {
	fs.readdir(customDir, function(err, files) {
		if(err) console.error(err);
		_.forEach(files, function(file) {
			fs.readFile(path.join(customDir, file), 'utf8', function (err, data) {
				if (err) console.error(err);
				writeToFile(file.replace('entity', entityName), replaceEntityName(data));
			});
		});
	});
}

fs.readFile(path.join(inDir, 'fields.txt'), 'utf8', function (err, data) {
	if (err) console.error(err);
	var input = _.map(data.split('\n'), function (item) {
		return item.split('\t');
	});
	writeToFile('index.js', generateIndex(input));
});

// Variables
var indexHeader = 'var extend = require(\'isight/entities/extend.js\');\n' +
	'var parentEnt = require(\'isight/entities/' + entityName + '\');\n\n' +
	'module.exports = extend(parentEnt, ';
var customHeader = 'var extend = require(\'isight/entities/extend.js\');\n' +
	'var standardChildConfig = require(\'isight/entities/standard-child-config.js\');\n\n' +
	'module.exports = extend(standardChildConfig, ';
var modelHeader = 'var BBModel = require(\'isight/public/lib/backbone-model.js\');\n\n' +
	'module.exports = BBModel.extend(';
var indexFooter = {
	acl: 'require(\'./acl.js\')',
	grids: 'require(\'./grids.js\')',
	rules: 'require(\'./rules.js\')',
	validation: 'require(\'./validation.js\')'
}
var picklistOptions = {};
var defaultCaseFields = [
	{ field: 'openToClosedCalendarDays', type: 'number', caption: 'Open To Closed Calendar Days', kind: 'system' },
	{ field: 'openToClosedBusinessDays', type: 'number', caption: 'Open To Closed Business Days', kind: 'system' },
	{ field: 'dataSource', type: 'textbox', kind: 'hidden' }
];
var defaultCustomOptions = {
	db: 'default',
	table: 'sys_' + entityName,
	entity: { base: 'sys', name: entityName },
	caption: _.startCase(entityName),
	captionPlural: pluralize(_.startCase(entityName)),
	addCaption: 'Add ' + _.startCase(entityName),
	newCaption: 'New ' + _.startCase(entityName),
	search: true,
	api: { useGenericApi: true }
}

// Functions
function generateIndex(data) {
	var fields = generateFields(data);
	var index;

	if(isCustom) {
		indexHeader = customHeader;
		index = defaultCustomOptions;
		index.fields = fields;
		writeToFile('sys_' + entityName + '.js', generateCustomController());
		writeToFile(entityName + '-model.js', generateModel());
		writeToFile('grids.js', generateGrids());
	} else {
		if(entityName === 'case') fields = _.concat(defaultCaseFields, fields);
		index = { fields: fields };
	}

	_.assign(index, indexFooter);
	writeToFile('options.picklists.js', picklistOptions);
	return index;
}

function generateFields(listOfLists) {
	return _.map(listOfLists, function (list) {
		var fieldtype = correctTypeName(list[1]);
		if(!fieldtype) throw 'input contains an invalid type';

		var field = {
			field: _.camelCase(list[0]),
			type: fieldtype,
			caption: list[0].trim()
		}

		if(_.includes(fieldtype, 'picklist')) {
			var picklistName = _.snakeCase(pluralize(list[0]));
			field.typeOptions = { picklistName: picklistName };
			if(list[2]) writeToFile(picklistName + '.json', generatePicklist(picklistName, list[2]));
			addOptions(picklistName);
		} else if(fieldtype === 'radio') {
			if(list[2] && !isYesNo(list[2])) {
				field.typeOptions = generateRadios(list[2]);
			} else {
				field.type = 'yesno';
			}
		}

		field.kind = 'editable';
		return field;
	});
}

function correctTypeName(type) {
	type = type.toLowerCase().trim();
	if(_.includes(type, 'drop') || type === 'picklist') return 'picklist';
	if(_.includes(type, 'multi') || type === 'picklist[]') return 'picklist[]';
	if(_.includes(type, 'editor') || _.includes(type, 'area')) return 'texteditor';
	if(_.includes(type, 'box') || _.includes(type, 'text')) return 'textbox';
	if(_.includes(type, 'date')) return 'date';
	if(_.includes(type, 'radio')) return 'radio';
	if(_.includes(type, 'user')) return 'user';
}

function generatePicklist(listName, list) {
	return _.map(list.split(','), function(item) {
		return {
			name: listName,
			value: _.snakeCase(item),
			caption: item.trim()
		};
	});
}

function generateRadios(radios) {
	return {
		radios: _.map(radios.split(','), function (item) {
			return { value: _.snakeCase(item), caption: _.snakeCase(item) };
		}),
		orientation: 'horizontal'
	};
}

function generateCustomController() {
	return {
		formName: entityName,
		entity: {
			base: 'sys',
			name: entityName
		},
		view: entityName + '-view.js',
		model: entityName + '-model.js',
		gridName: 'main-' + entityName,
		caseGridName: 'case-' + entityName
	}
}

function generateGrids() {
	var gridObj = {};
	gridObj['main-' + entityName] = {
		sortColumn: 'childNumber',
		sortOrder: 'desc',
		columns: [
			{ field: 'childNumber' },
			{ field: 'createdDate' }
		]
	};
	gridObj['case-' + entityName] = {
		sortColumn: 'number',
		sortOrder: 'desc',
		columns: [
			{ field: 'number' },
			{ field: 'createdDate' }
		]
	}
	return gridObj;
}

function generateModel() {
	return {
		urlRoot: '$appData.globalConfig.apiRoot + ' + '\'/' + entityName + '\'',
		entity: {
			base: 'sys',
			name: entityName
		},
		idAttribute: 'id'
	}
}

function addOptions(option) {
	picklistOptions[option] = {
		text: 'value',
		value: 'value'
	}
}

function isYesNo(radios) {
	var radioArray = radios.split(',');
	var result = true;
	if(radioArray.length > 2) result = false;
	_.forEach(radioArray, function(radio) {
		if(radio.toLowerCase() !== 'yes' && radio.trim().toLowerCase() !== 'no') result = false;
	});
	return result;
}

function indexFormat(data) {
	return JSON.stringify(data, null, '\t')
		.replace(/\"([^(\")"]+)\":/g,"$1:")
		.replace(/"/g, "'")
		.replace(/'require\(/g, "require(")
		.replace(/.js'\)'/g, ".js')");
}

function optionsFormat(data) {
	return JSON.stringify(data, null, '\t')
		.replace(/\"([^(\")"]+)\": {/g, "\'$1\': {")
		.replace(/\"([^(\")"]+)\":/g,"$1:")
		.replace(/"/g, "'");
}

function moduleFormat(data) {
	return JSON.stringify(data, null, '\t')
		.replace(/\"([^(\")"]+)\":/g,"$1:")
		.replace(/"/g, "'")
}

function modelFormat(data) {
	return JSON.stringify(data, null, '\t')
		.replace(/\"([^(\")"]+)\":/g,"$1:")
		.replace(/"/g, "'")
		.replace(/urlRoot: \'([^(\")"]+)\'\',/,"urlRoot: $1',")
}

function replaceEntityName(data) {
	return data
		.replace(/entity/g, entityName)
		.replace(/Entity/g, capitalize(entityName))
		.replace(/entities/g, pluralize(entityName))
		.replace(/Entities/g, pluralize(capitalize(entityName)));
}

function capitalize(data) {
	var words = data.split(' ');
	var capitalized = _.map(words, function(word) {
		return word.charAt(0).toUpperCase() + word.slice(1);
	});
	return capitalized.toString().replace(/,/g, ' ');
}

function writeToFile(fileName, content) {
	var file = fs.createWriteStream(path.join(outDir, fileName));
	var output;
	if(fileName === 'index.js') {
		output = indexHeader + indexFormat(content) + ');';
	} else if(fileName === 'options.picklists.js' || fileName === 'grids.js') {
		output = 'module.exports = ' + optionsFormat(content) + ';';
	} else if(_.includes(fileName, 'sys_')) {
		output = 'module.exports = ' + moduleFormat(content) + ';';
	} else if(_.includes(fileName, 'model.js')) {
		output = modelHeader + modelFormat(content) + ');';
	} else if(_.includes(fileName, '.json')) {
		output = JSON.stringify(content, null, '\t');
	} else {
		output = content;
	}
	file.write(output, 'utf8', function(err, data) {
		if(err) console.error(err);
		file.end();
	});
}