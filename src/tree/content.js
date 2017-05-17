(function (
	TreeNodeModel,
	HtmlHelper,
	NewCommentObserver,
	FileChangesObserver) {

	let _$pullRequestDiff,
        _$pullRequestDiffCompare,
        _$pullRequestTabNavigation,
        _$commitFilesSummary,
        _$diffSections,
        _treeObject,
        _$diffTreeContainer,
        _$treeDiff
    ;

	const _newCommentObserver = new NewCommentObserver(),
        _fileChangesObserver = new FileChangesObserver(),
        _settings = {};

	_settings.useCompactMode = true;

    $('#pull-request-diff-header').find('ul.detail-summary--section').append('<li class="detail-summary--item"><span class="aui-icon aui-icon-small aui-iconfont-devtools-submodule detail-summary--icon">Tree</span><a id="enableDiffTreeButton" href="#"><span class="aui-nav-item-label">Enable files tree</span></a></li>');
	$('#enableDiffTreeButton').on('click', function (e) {
	    e.preventDefault();
	    e.stopPropagation();

        enableDiffTree();
    });

	$(function() {
		_$pullRequestTabNavigation = $('#pullrequest-navigation, #compare-tabs');

		bindEvents();
	});

	function init() {
		_$pullRequestDiff = $('#pullrequest-diff, #diff, #compare-diff-content, #commit');
		_$pullRequestDiffCompare = _$pullRequestDiff.find('> #compare, > #changeset-diff.main');
		_$commitFilesSummary = _$pullRequestDiff.find('ul.commit-files-summary');
		_$diffSections = _$pullRequestDiff.find('section.iterable-item.bb-udiff');
	}

	function enableDiffTree() {
		if ($('#diffTreeContainer').length === 0) {
			init();

			_$commitFilesSummary.hide();
			_$diffSections.hide();

			buildDiffTree(true);
		}

		_newCommentObserver.startObserving(newCommentAdded);
		_fileChangesObserver.startObserving(enableDiffTree);
	}

	function disableDiffTree() {
		init();
		_$commitFilesSummary.show();
		_$diffSections.show();
		_$diffTreeContainer.remove();
		_$pullRequestDiffCompare.removeClass('diff-tree-aside');

		_newCommentObserver.stopObserving();
		_fileChangesObserver.stopObserving();
	}

	function bindEvents() {
		// when user change to "Overview" tab, the code changes is re-loaded, so we need to re-initialize the diff tree
		_$pullRequestTabNavigation.off('click', '#pr-menu-diff, #compare-diff-tab');
		_$pullRequestTabNavigation.on('click', '#pr-menu-diff, #compare-diff-tab');
	}

	function bindDiffTreeEvents() {
		$(document).off('click', '#btnRemoveDiffTree');
		$(document).on('click', '#btnRemoveDiffTree', function(e) {
			e.preventDefault();

			disableDiffTree();
		});

		$(document).off('click', '#btnCollapseExpandDiffTree');
		$(document).on('click', '#btnCollapseExpandDiffTree', function(e) {
			e.preventDefault();

			_$diffTreeContainer.toggleClass('expanded collapsed');
			_$pullRequestDiffCompare.toggleClass('expanded collapsed');

			$('#btnCollapseExpandDiffTree')
				.find('span.aui-icon')
				.toggleClass('aui-iconfont-arrows-left aui-iconfont-arrows-right');
		});

		$(document).off('click', '#btnCompactEmptyFoldersToggle');
		$(document).on('click', '#btnCompactEmptyFoldersToggle', function(e) {
			e.preventDefault();

			let useCompactMode = _settings.useCompactMode || false;
			useCompactMode = !useCompactMode;

			buildDiffTree(useCompactMode);
            saveCompactModeSetting(useCompactMode);

			const title = useCompactMode ? 'Uncompact empty folders' : 'Compact empty folders';

			$('#btnCompactEmptyFoldersToggle')
				.find('span.aui-icon')
				.toggleClass('aui-iconfont-unfocus aui-iconfont-focus')
				.attr('title', title);
		});
	}

	function bindJsTreeEvents() {
		_$treeDiff.on('after_open.jstree',
			function(event, data) {
				$('#' + data.node.id)
					.find('> a .jstree-node-icon')
					.removeClass('aui-iconfont-devtools-folder-closed')
					.addClass('aui-iconfont-devtools-folder-open');
			});

		_$treeDiff.on('after_close.jstree',
			function(event, data) {
				$('#' + data.node.id)
					.find('> a .jstree-node-icon')
					.removeClass('aui-iconfont-devtools-folder-open')
					.addClass('aui-iconfont-devtools-folder-closed');
			});

		_$treeDiff.on('select_node.jstree',
			function(event, data) {
				const $node = $('#' + data.node.id);
				const fileIdentifier = $node.data('file-identifier');
				if (fileIdentifier) {
					// Hide the current section
					_$diffSections.hide();

					// Show the selected section
					const sectionId = fileIdentifier.replace('#', '').replace(/%20/g, ' ');
					const $section = $('section[id*="' + sectionId + '"]');
					$section.show();

					$node.addClass('already-reviewed');
				}
			});
	}

	function buildDiffTree(isCompactMode) {
		isCompactMode = isCompactMode || false;

		_treeObject = populateDiffTreeObject();
		if (isCompactMode) {
			_treeObject = compactEmptyFoldersDiffTreeObject(_treeObject);
		}

		attachDiffTreeHtml(_treeObject);
		initializeJsTree();
		bindJsTreeEvents();
		bindDiffTreeEvents();
		showFirstFile();
	}

	function populateDiffTreeObject() {
		const treeObject = new TreeNodeModel('root', 0);

		_$commitFilesSummary
			.find('li.iterable-item')
			.each(function() {
				const $self = $(this);
				const fileName = $self.data('file-identifier');
				const link = $self.find('a').attr('href');
				const folders = fileName.split('/');
				const maxLevel = folders.length;
				let tempObject = treeObject;

				folders.forEach(function(folder, index) {
					let item = tempObject.children[folder];

					if (!item) {
						item = tempObject.children[folder] = new TreeNodeModel(folder, index + 1);

						if (index === maxLevel - 1) {
							tempObject.data.fileCount++;
						} else {
							tempObject.data.folderCount++;
						}
					}

					// Leaf node which contains file name
					if (index === maxLevel - 1) {
						item.data.isLeaf = true;
						item.data.link = link;
						item.data.fileStatus = getFileStatus($self);
						item.data.commentCount = getFileCommentCount($self);
					}

					tempObject = tempObject.children[folder];
				});
			});

		return treeObject;
	}

	function compactEmptyFoldersDiffTreeObject(treeObject) {
		let compactTreeObject = treeObject.cloneDataOnly();
		compactTreeObject = compactEmptyFoldersRecursive(treeObject);

		return compactTreeObject;
	}

	function compactEmptyFoldersRecursive(treeNode) {
		const treeNodeResult = treeNode.cloneDataOnly();
		let parentNode = treeNode;

		if (treeNode.data.isLeaf) {
			return treeNodeResult;
		}

		if (treeNode.isRoot() === false &&
			treeNode.data.folderCount === 1 &&
			treeNode.data.fileCount === 0) {

			let compactNodeName = parentNode.data.name;

			while (parentNode.data.folderCount === 1 && parentNode.data.fileCount === 0) {
				const firstFolderObject = parentNode.getChildByIndex(0);
				compactNodeName += '/' + firstFolderObject.data.name;
				parentNode = firstFolderObject;
			}

			treeNodeResult.data.name = compactNodeName;
		}

		const children = parentNode.getChildrenAsArray();
		children.forEach(function(child) {
			treeNodeResult.children[child.data.name] = compactEmptyFoldersRecursive(child);
		});

		return treeNodeResult;
	}

	function attachDiffTreeHtml(treeObject) {
		// Remove the current tree diff if any to prevent duplicated
		$('#diffTreeContainer').remove();

		// Build diff tree html
		let diffTreeContainer = '<div id="diffTreeContainer" class="expanded">';
		diffTreeContainer += HtmlHelper.buildDiffTreeActionsPanelHtml(_settings.useCompactMode);

		diffTreeContainer += '<div id="treeDiff">';
		diffTreeContainer += HtmlHelper.buildTreeHtml(treeObject);
		diffTreeContainer += '</div>'; // end of #treeDiff

		diffTreeContainer += '</div>'; // end of #difTreeContainer

		_$pullRequestDiffCompare.before(diffTreeContainer);
		_$pullRequestDiffCompare.addClass('diff-tree-aside');
		_$diffTreeContainer = $('#diffTreeContainer');
		_$treeDiff = $('#treeDiff');
	}

    function saveCompactModeSetting(useCompactMode) {
        _settings.useCompactMode = useCompactMode;
    }

	function initializeJsTree() {
		_$treeDiff.jstree({
			core: {
				multiple: false
			},

			plugins: ["sort"],

			sort: function(a, b) {
				const node1 = this.get_node(a);
				const node2 = this.get_node(b);

				//Put the folder first and then file
				if (node1.children.length > 0 && node2.children.length === 0) {
					return -1;
				} else if (node1.children.length === 0 && node2.children.length > 0) {
					return 1;
				}

				//Sort by name
				return node1.data.fileName.toLowerCase() > node2.data.fileName.toLowerCase() ? 1 : -1;
			}
		});

		// Expand all nodes
		_$treeDiff.jstree("open_all");
	}

	function showFirstFile() {
		const $firstFileNode = _$treeDiff.find('li.jstree-node.isLeaf:eq(0)');
		if ($firstFileNode.length > 0) {
			_$treeDiff.jstree(true).select_node($firstFileNode);
		}
	}

	function getFileStatus($iterableItem) {
		let fileStatus = null;

		if ($iterableItem.hasClass('file-added')) {
			fileStatus = 0;
		} else if ($iterableItem.hasClass('file-modified')) {
			fileStatus = 1;
		} else if ($iterableItem.hasClass('file-removed')) {
			fileStatus = 2;
		} else if ($iterableItem.hasClass('file-mergeconflict')) {
			fileStatus = 3;
		}

		return fileStatus;
	}

	function getFileCommentCount($iterableItem) {
		let count = 0;
		const $countBadge = $iterableItem.find('.count-badge');

		if ($countBadge.length === 1) {
			count = parseInt($countBadge.find('.count').text());
		}

		return count;
	}

	function newCommentAdded(target, addedNode) {
		const $section = $(target).closest('section.iterable-item.bb-udiff');
		const refUrl = $section.attr('id');
		const $treeNode = _$treeDiff.find('li.isLeaf[data-file-identifier*="' + refUrl + '"]');

		_$treeDiff.jstree(true).deselect_all();
		_$treeDiff.jstree(true).select_node($treeNode);

		setTimeout(function () {
			let $addedNode = $(addedNode);
			if (!$addedNode.hasClass('comment')) {
				$addedNode = $addedNode.find('li.comment:first-child');
			}

			scrollToNewCommentNode($addedNode);
		}, 500);
	}

	function scrollToNewCommentNode($addedNode) {
		const elOffset = $addedNode.offset().top;
		const elHeight = $addedNode.height();
		const windowHeight = $(window).height();

		let offset;
		if (elHeight < windowHeight) {
			offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
		}
		else {
			offset = elOffset;
		}

		// Animate and highlight the new comment node
		$addedNode.attr('style', 'background-color: #f5f5f5');
		$('html, body').stop().animate({
			scrollTop: offset
		}, 500, function () {
			setTimeout(function () {
				$addedNode.removeAttr('style');
			}, 1000);
		});
	}

})(
	BDT.Models.TreeNodeModel,
	BDT.Helpers.HtmlHelper,
	BDT.DomObservers.NewCommentObserver,
	BDT.DomObservers.FileChangesObserver);
