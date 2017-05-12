const waitForRender = require('../wait-for-render');
require('mousetrap');

/**
 * Adds useful keymappings to pull requests on bitbucket.org
 * @module keymap
 */
const PrKeyMap = (function ($) {
    'use strict';

    /**
     * The default keymap for key binds a.k.a. shortcut keys.
     */
    const DEFAULT_KEYMAP = {
        tabOverview: '1',
        tabComments: '2',
        tabActivity: '3',

        scrollNextComment: 'N',
        scrollPreviousComment: 'P',
        scrollPageTop: 'g g',
        scrollPageBottom: 'shift+g'
    };

    const keymap = {};

    const ids = {
        overview: '#pr-menu-diff',
        commits: '#pr-menu-commits',
        activity: '#pr-menu-activity'
    };

    const self = {};

    self.commentSelector = '.iterable-item a.author';
    self.iterableItemSelector = '.iterable-item';
    self.comments = [];

    self.currentComment = 0;

    /**
     * Switches to a tab, if there is a selector available for that tab.
     */
    self.switchTo = function (tabName) {
        if (tabName in ids) {
            const element = document.querySelector(ids[tabName]);
            element.click();
        }
    };

    /**
     * Sets focus to a particular comment.
     */
    self.focusComment = function (comment) {
        $(self.iterableItemSelector).removeClass('focused');
        $(comment).addClass('focused');
        comment.scrollIntoView();
    };

    /**
     * Initializes array of comments elements to cycle through using
     * {@link #scrollToNextComment} or {@link #scrollToPreviousComment}.
     *
     * Waits for `selector` to be available before initializing comments.
     *
     * @param {String} selector waits for this selector to become available
     * before initializing comments. If empty, uses the default `.bb-patch`
     * selector.
     */
    self.initComments = function (selector = '.bb-patch') {
        waitForRender(selector).then(() => {
            self.comments = document.querySelectorAll(self.commentSelector);
        });
    };

    /**
     * Scrolls the browser window to the next comment on the PR diff.
     *
     * If scrolling to the next comment from the last comment, this will loop back
     * to the top-most (first) comment on the page.
     *
     */
    self.scrollToNextComment = function () {
        if (self.comments) {
            $(self.comments[self.currentComment]).removeClass('focused');
            self.currentComment++;
            if (self.currentComment >= self.comments.length) {
                self.currentComment = 0;
            }

            const comment = self.comments[self.currentComment].parentElement.parentElement;
            self.focusComment(comment);
        }
    };

    /**
     * Scrolls the browser window to the previous comment on the PR diff.
     *
     * If scrolling to previous comment from the top commit, this will loop back to the
     * bottom-most (last) comment on the page.
     */
    self.scrollToPreviousComment = function () {
        if (self.comments) {
            self.currentComment--;
            if (self.currentComment < 0) {
                self.currentComment = self.comments.length - 1;
            }

            const comment = self.comments[self.currentComment].parentElement.parentElement;
            self.focusComment(comment);
        }
    };

    /**
     * Initializes keybinds.
     *
     * @param {Object} keyboard the keyboard library to use to bind keys (usually Mousetrap).
     */
    self.init = function (keyboard) {
        Object.assign(keymap, DEFAULT_KEYMAP);

        keyboard.reset();
        self.initComments();

        $(ids.overview).click(() => {
            self.initComments();
        });

        $(ids.activity).click(() => {
            self.initComments('header .summary');
        });

        keyboard.bind(keymap.tabOverview, event => {
            event.preventDefault();
            self.switchTo('overview');
        });

        keyboard.bind(keymap.tabComments, event => {
            event.preventDefault();
            self.switchTo('commits');
        });

        keyboard.bind(keymap.tabActivity, event => {
            event.preventDefault();
            self.switchTo('activity');
        });

        keyboard.bind(keymap.scrollNextComment, event => {
            event.preventDefault();
            self.scrollToNextComment();
        });

        keyboard.bind(keymap.scrollPreviousComment, event => {
            event.preventDefault();
            self.scrollToPreviousComment();
        });

        keyboard.bind(keymap.scrollPageTop, event => {
            // gg to scroll to top
            event.preventDefault();

            let element = document.getElementById("content");
            element.scrollIntoView();
        });

        keyboard.bind(keymap.scrollPageBottom, event => {
            // scroll to bottom
            event.preventDefault();

            let element = document.getElementById("content");
            element.scrollIntoView(false);
        });
    };

    return self;
})(jQuery);

module.exports = (() => {
    return {
        init
    };

    function init(keyboard) {
        PrKeyMap.init(keyboard);
    }
})();
