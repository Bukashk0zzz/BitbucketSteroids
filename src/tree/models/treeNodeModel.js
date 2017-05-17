(function(){
    'use strict';

	const TreeNodeModel = function (name, level) {
        const _this = this;

        _this.children = {};

        _this.data = {
            name: name,
            level: level,
            isLeaf: false,
            link: null,
            folderCount: 0,
            fileCount: 0,
            fileStatus: null,
            commentCount: 0
        }
    };

	TreeNodeModel.prototype.isRoot = function() {
		const _this = this;
		return _this.data.level === 0;
	};

	TreeNodeModel.prototype.cloneDataOnly = function() {
		const _this = this;
		const newObject = new TreeNodeModel(_this.data.name, _this.data.level);

		newObject.data = {
			name: _this.data.name,
			level: _this.data.level,
			isLeaf: _this.data.isLeaf,
			link: _this.data.link,
			folderCount: _this.data.folderCount,
			fileCount: _this.data.fileCount,
			fileStatus: _this.data.fileStatus,
			commentCount: _this.data.commentCount
		};

		return newObject;
	};

	TreeNodeModel.prototype.getChildByIndex = function(index) {
		const _this = this;
		const childrenNames = Object.keys(_this.children);

		if (index < 0 || index > childrenNames.length - 1) {
			return null;
		}

		return _this.children[childrenNames[index]];
	};


	TreeNodeModel.prototype.getChildrenAsArray = function() {
		const _this = this;
		const children = [];
		const childrenNames = Object.keys(_this.children);

		childrenNames.forEach(function(name) {
			children.push(_this.children[name]);
		});

		return children;
	};

	TreeNodeModel.prototype.getFoldersAsArray = function() {
		const _this = this;
		const folders = [];
		const childrenNames = Object.keys(_this.children);

		childrenNames.forEach(function(name) {
			if (_this.children[name].data.isLeaf === false) {
				folders.push(_this.children[name]);
			}
		});

		return folders;
	};

	TreeNodeModel.prototype.getFilesAsArray = function() {
		const _this = this;
		const files = [];
		const childrenNames = Object.keys(_this.children);

		childrenNames.forEach(function(name) {
			if (_this.children[name].data.isLeaf === true) {
				files.push(_this.children[name]);
			}
		});

		return files;
	};

	// Export via namespace
	BDT.Models.TreeNodeModel = TreeNodeModel;

})();
