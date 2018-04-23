(function() {
    /*

 Copyright 2015 Google Inc. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
    var componentHandler = {
        upgradeDom: function(optJsClass, optCssClass) {},
        upgradeElement: function(element, optJsClass) {},
        upgradeElements: function(elements) {},
        upgradeAllRegistered: function() {},
        registerUpgradedCallback: function(jsClass, callback) {},
        register: function(config) {},
        downgradeElements: function(nodes) {}
    };
    componentHandler = function() {
        var registeredComponents_ = [];
        var createdComponents_ = [];
        var componentConfigProperty_ = "mdlComponentConfigInternal_";

        function findRegisteredClass_(name, optReplace) {
            for (var i = 0; i < registeredComponents_.length; i++)
                if (registeredComponents_[i].className === name) {
                    if (typeof optReplace !== "undefined") registeredComponents_[i] = optReplace;
                    return registeredComponents_[i]
                }
            return false
        }

        function getUpgradedListOfElement_(element) {
            var dataUpgraded = element.getAttribute("data-upgraded");
            return dataUpgraded ===
                null ? [""] : dataUpgraded.split(",")
        }

        function isElementUpgraded_(element, jsClass) {
            var upgradedList = getUpgradedListOfElement_(element);
            return upgradedList.indexOf(jsClass) !== -1
        }

        function createEvent_(eventType, bubbles, cancelable) {
            if ("CustomEvent" in window && typeof window.CustomEvent === "function") return new CustomEvent(eventType, {
                bubbles: bubbles,
                cancelable: cancelable
            });
            else {
                var ev = document.createEvent("Events");
                ev.initEvent(eventType, bubbles, cancelable);
                return ev
            }
        }

        function upgradeDomInternal(optJsClass,
            optCssClass) {
            if (typeof optJsClass === "undefined" && typeof optCssClass === "undefined")
                for (var i = 0; i < registeredComponents_.length; i++) upgradeDomInternal(registeredComponents_[i].className, registeredComponents_[i].cssClass);
            else {
                var jsClass = (optJsClass);
                if (typeof optCssClass === "undefined") {
                    var registeredClass = findRegisteredClass_(jsClass);
                    if (registeredClass) optCssClass = registeredClass.cssClass
                }
                var elements = document.querySelectorAll("." + optCssClass);
                for (var n = 0; n < elements.length; n++) upgradeElementInternal(elements[n],
                    jsClass)
            }
        }

        function upgradeElementInternal(element, optJsClass) {
            if (!(typeof element === "object" && element instanceof Element)) throw new Error("Invalid argument provided to upgrade MDL element.");
            var upgradingEv = createEvent_("mdl-componentupgrading", true, true);
            element.dispatchEvent(upgradingEv);
            if (upgradingEv.defaultPrevented) return;
            var upgradedList = getUpgradedListOfElement_(element);
            var classesToUpgrade = [];
            if (!optJsClass) {
                var classList = element.classList;
                registeredComponents_.forEach(function(component) {
                    if (classList.contains(component.cssClass) &&
                        classesToUpgrade.indexOf(component) === -1 && !isElementUpgraded_(element, component.className)) classesToUpgrade.push(component)
                })
            } else if (!isElementUpgraded_(element, optJsClass)) classesToUpgrade.push(findRegisteredClass_(optJsClass));
            for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
                registeredClass = classesToUpgrade[i];
                if (registeredClass) {
                    upgradedList.push(registeredClass.className);
                    element.setAttribute("data-upgraded", upgradedList.join(","));
                    var instance = new registeredClass.classConstructor(element);
                    instance[componentConfigProperty_] = registeredClass;
                    createdComponents_.push(instance);
                    for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) registeredClass.callbacks[j](element);
                    if (registeredClass.widget) element[registeredClass.className] = instance
                } else throw new Error("Unable to find a registered component for the given class.");
                var upgradedEv = createEvent_("mdl-componentupgraded", true, false);
                element.dispatchEvent(upgradedEv)
            }
        }

        function upgradeElementsInternal(elements) {
            if (!Array.isArray(elements))
                if (elements instanceof Element) elements = [elements];
                else elements = Array.prototype.slice.call(elements);
            for (var i = 0, n = elements.length, element; i < n; i++) {
                element = elements[i];
                if (element instanceof HTMLElement) {
                    upgradeElementInternal(element);
                    if (element.children.length > 0) upgradeElementsInternal(element.children)
                }
            }
        }

        function registerInternal(config) {
            var widgetMissing = typeof config.widget === "undefined" && typeof config["widget"] === "undefined";
            var widget = true;
            if (!widgetMissing) widget = config.widget || config["widget"];
            var newConfig = ({
                classConstructor: config.constructor ||
                    config["constructor"],
                className: config.classAsString || config["classAsString"],
                cssClass: config.cssClass || config["cssClass"],
                widget: widget,
                callbacks: []
            });
            registeredComponents_.forEach(function(item) {
                if (item.cssClass === newConfig.cssClass) throw new Error("The provided cssClass has already been registered: " + item.cssClass);
                if (item.className === newConfig.className) throw new Error("The provided className has already been registered");
            });
            if (config.constructor.prototype.hasOwnProperty(componentConfigProperty_)) throw new Error("MDL component classes must not have " +
                componentConfigProperty_ + " defined as a property.");
            var found = findRegisteredClass_(config.classAsString, newConfig);
            if (!found) registeredComponents_.push(newConfig)
        }

        function registerUpgradedCallbackInternal(jsClass, callback) {
            var regClass = findRegisteredClass_(jsClass);
            if (regClass) regClass.callbacks.push(callback)
        }

        function upgradeAllRegisteredInternal() {
            for (var n = 0; n < registeredComponents_.length; n++) upgradeDomInternal(registeredComponents_[n].className)
        }

        function deconstructComponentInternal(component) {
            if (component) {
                var componentIndex =
                    createdComponents_.indexOf(component);
                createdComponents_.splice(componentIndex, 1);
                var upgrades = component.element_.getAttribute("data-upgraded").split(",");
                var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
                upgrades.splice(componentPlace, 1);
                component.element_.setAttribute("data-upgraded", upgrades.join(","));
                var ev = createEvent_("mdl-componentdowngraded", true, false);
                component.element_.dispatchEvent(ev)
            }
        }

        function downgradeNodesInternal(nodes) {
            var downgradeNode = function(node) {
                createdComponents_.filter(function(item) {
                    return item.element_ ===
                        node
                }).forEach(deconstructComponentInternal)
            };
            if (nodes instanceof Array || nodes instanceof NodeList)
                for (var n = 0; n < nodes.length; n++) downgradeNode(nodes[n]);
            else if (nodes instanceof Node) downgradeNode(nodes);
            else throw new Error("Invalid argument provided to downgrade MDL nodes.");
        }
        return {
            upgradeDom: upgradeDomInternal,
            upgradeElement: upgradeElementInternal,
            upgradeElements: upgradeElementsInternal,
            upgradeAllRegistered: upgradeAllRegisteredInternal,
            registerUpgradedCallback: registerUpgradedCallbackInternal,
            register: registerInternal,
            downgradeElements: downgradeNodesInternal
        }
    }();
    componentHandler.ComponentConfigPublic;
    componentHandler.ComponentConfig;
    componentHandler.Component;
    componentHandler["upgradeDom"] = componentHandler.upgradeDom;
    componentHandler["upgradeElement"] = componentHandler.upgradeElement;
    componentHandler["upgradeElements"] = componentHandler.upgradeElements;
    componentHandler["upgradeAllRegistered"] = componentHandler.upgradeAllRegistered;
    componentHandler["registerUpgradedCallback"] = componentHandler.registerUpgradedCallback;
    componentHandler["register"] = componentHandler.register;
    componentHandler["downgradeElements"] = componentHandler.downgradeElements;
    window.componentHandler = componentHandler;
    window["componentHandler"] = componentHandler;
    window.addEventListener("load", function() {
        if ("classList" in document.createElement("div") && "querySelector" in document && "addEventListener" in window && Array.prototype.forEach) {
            document.documentElement.classList.add("mdl-js");
            componentHandler.upgradeAllRegistered()
        } else {
            componentHandler.upgradeElement = function() {};
            componentHandler.register = function() {}
        }
    });
    (function() {
        var MaterialButton = function MaterialButton(element) {
            this.element_ = element;
            this.init()
        };
        window["MaterialButton"] = MaterialButton;
        MaterialButton.prototype.Constant_ = {};
        MaterialButton.prototype.CssClasses_ = {
            RIPPLE_EFFECT: "mdl-js-ripple-effect",
            RIPPLE_CONTAINER: "mdl-button__ripple-container",
            RIPPLE: "mdl-ripple"
        };
        MaterialButton.prototype.blurHandler_ = function(event) {
            if (event) this.element_.blur()
        };
        MaterialButton.prototype.disable = function() {
            this.element_.disabled = true
        };
        MaterialButton.prototype["disable"] =
            MaterialButton.prototype.disable;
        MaterialButton.prototype.enable = function() {
            this.element_.disabled = false
        };
        MaterialButton.prototype["enable"] = MaterialButton.prototype.enable;
        MaterialButton.prototype.init = function() {
            if (this.element_) {
                if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
                    var rippleContainer = document.createElement("span");
                    rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
                    this.rippleElement_ = document.createElement("span");
                    this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
                    rippleContainer.appendChild(this.rippleElement_);
                    this.boundRippleBlurHandler = this.blurHandler_.bind(this);
                    this.rippleElement_.addEventListener("mouseup", this.boundRippleBlurHandler);
                    this.element_.appendChild(rippleContainer)
                }
                this.boundButtonBlurHandler = this.blurHandler_.bind(this);
                this.element_.addEventListener("mouseup", this.boundButtonBlurHandler);
                this.element_.addEventListener("mouseleave", this.boundButtonBlurHandler)
            }
        };
        componentHandler.register({
            constructor: MaterialButton,
            classAsString: "MaterialButton",
            cssClass: "mdl-js-button",
            widget: true
        })
    })();
    (function() {
        var MaterialProgress = function MaterialProgress(element) {
            this.element_ = element;
            this.init()
        };
        window["MaterialProgress"] = MaterialProgress;
        MaterialProgress.prototype.Constant_ = {};
        MaterialProgress.prototype.CssClasses_ = {
            INDETERMINATE_CLASS: "mdl-progress__indeterminate"
        };
        MaterialProgress.prototype.setProgress = function(p) {
            if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) return;
            this.progressbar_.style.width = p + "%"
        };
        MaterialProgress.prototype["setProgress"] = MaterialProgress.prototype.setProgress;
        MaterialProgress.prototype.setBuffer = function(p) {
            this.bufferbar_.style.width = p + "%";
            this.auxbar_.style.width = 100 - p + "%"
        };
        MaterialProgress.prototype["setBuffer"] = MaterialProgress.prototype.setBuffer;
        MaterialProgress.prototype.init = function() {
            if (this.element_) {
                var el = document.createElement("div");
                el.className = "progressbar bar bar1";
                this.element_.appendChild(el);
                this.progressbar_ = el;
                el = document.createElement("div");
                el.className = "bufferbar bar bar2";
                this.element_.appendChild(el);
                this.bufferbar_ = el;
                el = document.createElement("div");
                el.className = "auxbar bar bar3";
                this.element_.appendChild(el);
                this.auxbar_ = el;
                this.progressbar_.style.width = "0%";
                this.bufferbar_.style.width = "100%";
                this.auxbar_.style.width = "0%";
                this.element_.classList.add("is-upgraded")
            }
        };
        componentHandler.register({
            constructor: MaterialProgress,
            classAsString: "MaterialProgress",
            cssClass: "mdl-js-progress",
            widget: true
        })
    })();
    (function() {
        var MaterialSpinner = function MaterialSpinner(element) {
            this.element_ = element;
            this.init()
        };
        window["MaterialSpinner"] = MaterialSpinner;
        MaterialSpinner.prototype.Constant_ = {
            MDL_SPINNER_LAYER_COUNT: 4
        };
        MaterialSpinner.prototype.CssClasses_ = {
            MDL_SPINNER_LAYER: "mdl-spinner__layer",
            MDL_SPINNER_CIRCLE_CLIPPER: "mdl-spinner__circle-clipper",
            MDL_SPINNER_CIRCLE: "mdl-spinner__circle",
            MDL_SPINNER_GAP_PATCH: "mdl-spinner__gap-patch",
            MDL_SPINNER_LEFT: "mdl-spinner__left",
            MDL_SPINNER_RIGHT: "mdl-spinner__right"
        };
        MaterialSpinner.prototype.createLayer = function(index) {
            var layer = document.createElement("div");
            layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER);
            layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER + "-" + index);
            var leftClipper = document.createElement("div");
            leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
            leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);
            var gapPatch = document.createElement("div");
            gapPatch.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);
            var rightClipper =
                document.createElement("div");
            rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
            rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);
            var circleOwners = [leftClipper, gapPatch, rightClipper];
            for (var i = 0; i < circleOwners.length; i++) {
                var circle = document.createElement("div");
                circle.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE);
                circleOwners[i].appendChild(circle)
            }
            layer.appendChild(leftClipper);
            layer.appendChild(gapPatch);
            layer.appendChild(rightClipper);
            this.element_.appendChild(layer)
        };
        MaterialSpinner.prototype["createLayer"] = MaterialSpinner.prototype.createLayer;
        MaterialSpinner.prototype.stop = function() {
            this.element_.classList.remove("is-active")
        };
        MaterialSpinner.prototype["stop"] = MaterialSpinner.prototype.stop;
        MaterialSpinner.prototype.start = function() {
            this.element_.classList.add("is-active")
        };
        MaterialSpinner.prototype["start"] = MaterialSpinner.prototype.start;
        MaterialSpinner.prototype.init = function() {
            if (this.element_) {
                for (var i = 1; i <= this.Constant_.MDL_SPINNER_LAYER_COUNT; i++) this.createLayer(i);
                this.element_.classList.add("is-upgraded")
            }
        };
        componentHandler.register({
            constructor: MaterialSpinner,
            classAsString: "MaterialSpinner",
            cssClass: "mdl-js-spinner",
            widget: true
        })
    })();
    (function() {
        var MaterialTextfield = function MaterialTextfield(element) {
            this.element_ = element;
            this.maxRows = this.Constant_.NO_MAX_ROWS;
            this.init()
        };
        window["MaterialTextfield"] = MaterialTextfield;
        MaterialTextfield.prototype.Constant_ = {
            NO_MAX_ROWS: -1,
            MAX_ROWS_ATTRIBUTE: "maxrows"
        };
        MaterialTextfield.prototype.CssClasses_ = {
            LABEL: "mdl-textfield__label",
            INPUT: "mdl-textfield__input",
            IS_DIRTY: "is-dirty",
            IS_FOCUSED: "is-focused",
            IS_DISABLED: "is-disabled",
            IS_INVALID: "is-invalid",
            IS_UPGRADED: "is-upgraded",
            HAS_PLACEHOLDER: "has-placeholder"
        };
        MaterialTextfield.prototype.onKeyDown_ = function(event) {
            var currentRowCount = event.target.value.split("\n").length;
            if (event.keyCode === 13)
                if (currentRowCount >= this.maxRows) event.preventDefault()
        };
        MaterialTextfield.prototype.onFocus_ = function(event) {
            this.element_.classList.add(this.CssClasses_.IS_FOCUSED)
        };
        MaterialTextfield.prototype.onBlur_ = function(event) {
            this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)
        };
        MaterialTextfield.prototype.onReset_ = function(event) {
            this.updateClasses_()
        };
        MaterialTextfield.prototype.updateClasses_ =
            function() {
                this.checkDisabled();
                this.checkValidity();
                this.checkDirty();
                this.checkFocus()
            };
        MaterialTextfield.prototype.checkDisabled = function() {
            if (this.input_.disabled) this.element_.classList.add(this.CssClasses_.IS_DISABLED);
            else this.element_.classList.remove(this.CssClasses_.IS_DISABLED)
        };
        MaterialTextfield.prototype["checkDisabled"] = MaterialTextfield.prototype.checkDisabled;
        MaterialTextfield.prototype.checkFocus = function() {
            if (Boolean(this.element_.querySelector(":focus"))) this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
            else this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)
        };
        MaterialTextfield.prototype["checkFocus"] = MaterialTextfield.prototype.checkFocus;
        MaterialTextfield.prototype.checkValidity = function() {
            if (this.input_.validity)
                if (this.input_.validity.valid) this.element_.classList.remove(this.CssClasses_.IS_INVALID);
                else this.element_.classList.add(this.CssClasses_.IS_INVALID)
        };
        MaterialTextfield.prototype["checkValidity"] = MaterialTextfield.prototype.checkValidity;
        MaterialTextfield.prototype.checkDirty =
            function() {
                if (this.input_.value && this.input_.value.length > 0) this.element_.classList.add(this.CssClasses_.IS_DIRTY);
                else this.element_.classList.remove(this.CssClasses_.IS_DIRTY)
            };
        MaterialTextfield.prototype["checkDirty"] = MaterialTextfield.prototype.checkDirty;
        MaterialTextfield.prototype.disable = function() {
            this.input_.disabled = true;
            this.updateClasses_()
        };
        MaterialTextfield.prototype["disable"] = MaterialTextfield.prototype.disable;
        MaterialTextfield.prototype.enable = function() {
            this.input_.disabled = false;
            this.updateClasses_()
        };
        MaterialTextfield.prototype["enable"] = MaterialTextfield.prototype.enable;
        MaterialTextfield.prototype.change = function(value) {
            this.input_.value = value || "";
            this.updateClasses_()
        };
        MaterialTextfield.prototype["change"] = MaterialTextfield.prototype.change;
        MaterialTextfield.prototype.init = function() {
            if (this.element_) {
                this.label_ = this.element_.querySelector("." + this.CssClasses_.LABEL);
                this.input_ = this.element_.querySelector("." + this.CssClasses_.INPUT);
                if (this.input_) {
                    if (this.input_.hasAttribute((this.Constant_.MAX_ROWS_ATTRIBUTE))) {
                        this.maxRows =
                            parseInt(this.input_.getAttribute((this.Constant_.MAX_ROWS_ATTRIBUTE)), 10);
                        if (isNaN(this.maxRows)) this.maxRows = this.Constant_.NO_MAX_ROWS
                    }
                    if (this.input_.hasAttribute("placeholder")) this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER);
                    this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
                    this.boundFocusHandler = this.onFocus_.bind(this);
                    this.boundBlurHandler = this.onBlur_.bind(this);
                    this.boundResetHandler = this.onReset_.bind(this);
                    this.input_.addEventListener("input", this.boundUpdateClassesHandler);
                    this.input_.addEventListener("focus", this.boundFocusHandler);
                    this.input_.addEventListener("blur", this.boundBlurHandler);
                    this.input_.addEventListener("reset", this.boundResetHandler);
                    if (this.maxRows !== this.Constant_.NO_MAX_ROWS) {
                        this.boundKeyDownHandler = this.onKeyDown_.bind(this);
                        this.input_.addEventListener("keydown", this.boundKeyDownHandler)
                    }
                    var invalid = this.element_.classList.contains(this.CssClasses_.IS_INVALID);
                    this.updateClasses_();
                    this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
                    if (invalid) this.element_.classList.add(this.CssClasses_.IS_INVALID);
                    if (this.input_.hasAttribute("autofocus")) {
                        this.element_.focus();
                        this.checkFocus()
                    }
                }
            }
        };
        componentHandler.register({
            constructor: MaterialTextfield,
            classAsString: "MaterialTextfield",
            cssClass: "mdl-js-textfield",
            widget: true
        })
    })();
    (function() {
        var supportCustomEvent = window.CustomEvent;
        if (!supportCustomEvent || typeof supportCustomEvent === "object") {
            supportCustomEvent = function CustomEvent(event, x) {
                x = x || {};
                var ev = document.createEvent("CustomEvent");
                ev.initCustomEvent(event, !!x.bubbles, !!x.cancelable, x.detail || null);
                return ev
            };
            supportCustomEvent.prototype = window.Event.prototype
        }

        function createsStackingContext(el) {
            while (el && el !== document.body) {
                var s = window.getComputedStyle(el);
                var invalid = function(k, ok) {
                    return !(s[k] === undefined || s[k] ===
                        ok)
                };
                if (s.opacity < 1 || invalid("zIndex", "auto") || invalid("transform", "none") || invalid("mixBlendMode", "normal") || invalid("filter", "none") || invalid("perspective", "none") || s["isolation"] === "isolate" || s.position === "fixed" || s.webkitOverflowScrolling === "touch") return true;
                el = el.parentElement
            }
            return false
        }

        function findNearestDialog(el) {
            while (el) {
                if (el.localName === "dialog") return (el);
                el = el.parentElement
            }
            return null
        }

        function safeBlur(el) {
            if (el && el.blur && el !== document.body) el.blur()
        }

        function inNodeList(nodeList,
            node) {
            for (var i = 0; i < nodeList.length; ++i)
                if (nodeList[i] === node) return true;
            return false
        }

        function isFormMethodDialog(el) {
            if (!el || !el.hasAttribute("method")) return false;
            return el.getAttribute("method").toLowerCase() === "dialog"
        }

        function dialogPolyfillInfo(dialog) {
            this.dialog_ = dialog;
            this.replacedStyleTop_ = false;
            this.openAsModal_ = false;
            if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
            dialog.show = this.show.bind(this);
            dialog.showModal = this.showModal.bind(this);
            dialog.close = this.close.bind(this);
            if (!("returnValue" in dialog)) dialog.returnValue = "";
            if ("MutationObserver" in window) {
                var mo = new MutationObserver(this.maybeHideModal.bind(this));
                mo.observe(dialog, {
                    attributes: true,
                    attributeFilter: ["open"]
                })
            } else {
                var removed = false;
                var cb = function() {
                    removed ? this.downgradeModal() : this.maybeHideModal();
                    removed = false
                }.bind(this);
                var timeout;
                var delayModel = function(ev) {
                    if (ev.target !== dialog) return;
                    var cand = "DOMNodeRemoved";
                    removed |= ev.type.substr(0, cand.length) === cand;
                    window.clearTimeout(timeout);
                    timeout =
                        window.setTimeout(cb, 0)
                };
                ["DOMAttrModified", "DOMNodeRemoved", "DOMNodeRemovedFromDocument"].forEach(function(name) {
                    dialog.addEventListener(name, delayModel)
                })
            }
            Object.defineProperty(dialog, "open", {
                set: this.setOpen.bind(this),
                get: dialog.hasAttribute.bind(dialog, "open")
            });
            this.backdrop_ = document.createElement("div");
            this.backdrop_.className = "backdrop";
            this.backdrop_.addEventListener("click", this.backdropClick_.bind(this))
        }
        dialogPolyfillInfo.prototype = {
            get dialog() {
                return this.dialog_
            },
            maybeHideModal: function() {
                if (this.dialog_.hasAttribute("open") &&
                    document.body.contains(this.dialog_)) return;
                this.downgradeModal()
            },
            downgradeModal: function() {
                if (!this.openAsModal_) return;
                this.openAsModal_ = false;
                this.dialog_.style.zIndex = "";
                if (this.replacedStyleTop_) {
                    this.dialog_.style.top = "";
                    this.replacedStyleTop_ = false
                }
                this.backdrop_.parentNode && this.backdrop_.parentNode.removeChild(this.backdrop_);
                dialogPolyfill.dm.removeDialog(this)
            },
            setOpen: function(value) {
                if (value) this.dialog_.hasAttribute("open") || this.dialog_.setAttribute("open", "");
                else {
                    this.dialog_.removeAttribute("open");
                    this.maybeHideModal()
                }
            },
            backdropClick_: function(e) {
                if (!this.dialog_.hasAttribute("tabindex")) {
                    var fake = document.createElement("div");
                    this.dialog_.insertBefore(fake, this.dialog_.firstChild);
                    fake.tabIndex = -1;
                    fake.focus();
                    this.dialog_.removeChild(fake)
                } else this.dialog_.focus();
                var redirectedEvent = document.createEvent("MouseEvents");
                redirectedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, window, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
                this.dialog_.dispatchEvent(redirectedEvent);
                e.stopPropagation()
            },
            focus_: function() {
                var target = this.dialog_.querySelector("[autofocus]:not([disabled])");
                if (!target && this.dialog_.tabIndex >= 0) target = this.dialog_;
                if (!target) {
                    var opts = ["button", "input", "keygen", "select", "textarea"];
                    var query = opts.map(function(el) {
                        return el + ":not([disabled])"
                    });
                    query.push('[tabindex]:not([disabled]):not([tabindex=""])');
                    target = this.dialog_.querySelector(query.join(", "))
                }
                safeBlur(document.activeElement);
                target && target.focus()
            },
            updateZIndex: function(dialogZ, backdropZ) {
                if (dialogZ < backdropZ) throw new Error("dialogZ should never be < backdropZ");
                this.dialog_.style.zIndex = dialogZ;
                this.backdrop_.style.zIndex = backdropZ
            },
            show: function() {
                if (!this.dialog_.open) {
                    this.setOpen(true);
                    this.focus_()
                }
            },
            showModal: function() {
                if (this.dialog_.hasAttribute("open")) throw new Error("Failed to execute 'showModal' on dialog: The element is already open, and therefore cannot be opened modally.");
                if (!document.body.contains(this.dialog_)) throw new Error("Failed to execute 'showModal' on dialog: The element is not in a Document.");
                if (!dialogPolyfill.dm.pushDialog(this)) throw new Error("Failed to execute 'showModal' on dialog: There are too many open modal dialogs.");
                if (createsStackingContext(this.dialog_.parentElement)) console.warn("A dialog is being shown inside a stacking context. " + "This may cause it to be unusable. For more information, see this link: " + "https://github.com/GoogleChrome/dialog-polyfill/#stacking-context");
                this.setOpen(true);
                this.openAsModal_ = true;
                if (dialogPolyfill.needsCentering(this.dialog_)) {
                    dialogPolyfill.reposition(this.dialog_);
                    this.replacedStyleTop_ = true
                } else this.replacedStyleTop_ = false;
                this.dialog_.parentNode.insertBefore(this.backdrop_, this.dialog_.nextSibling);
                this.focus_()
            },
            close: function(opt_returnValue) {
                if (!this.dialog_.hasAttribute("open")) throw new Error("Failed to execute 'close' on dialog: The element does not have an 'open' attribute, and therefore cannot be closed.");
                this.setOpen(false);
                if (opt_returnValue !== undefined) this.dialog_.returnValue = opt_returnValue;
                var closeEvent = new supportCustomEvent("close", {
                    bubbles: false,
                    cancelable: false
                });
                this.dialog_.dispatchEvent(closeEvent)
            }
        };
        var dialogPolyfill = {};
        dialogPolyfill.reposition = function(element) {
            var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
            var topValue = scrollTop + (window.innerHeight - element.offsetHeight) / 2;
            element.style.top = Math.max(scrollTop, topValue) + "px"
        };
        dialogPolyfill.isInlinePositionSetByStylesheet = function(element) {
            for (var i = 0; i < document.styleSheets.length; ++i) {
                var styleSheet = document.styleSheets[i];
                var cssRules = null;
                try {
                    cssRules =
                        styleSheet.cssRules
                } catch (e) {}
                if (!cssRules) continue;
                for (var j = 0; j < cssRules.length; ++j) {
                    var rule = cssRules[j];
                    var selectedNodes = null;
                    try {
                        selectedNodes = document.querySelectorAll(rule.selectorText)
                    } catch (e$0) {}
                    if (!selectedNodes || !inNodeList(selectedNodes, element)) continue;
                    var cssTop = rule.style.getPropertyValue("top");
                    var cssBottom = rule.style.getPropertyValue("bottom");
                    if (cssTop && cssTop !== "auto" || cssBottom && cssBottom !== "auto") return true
                }
            }
            return false
        };
        dialogPolyfill.needsCentering = function(dialog) {
            var computedStyle =
                window.getComputedStyle(dialog);
            if (computedStyle.position !== "absolute") return false;
            if (dialog.style.top !== "auto" && dialog.style.top !== "" || dialog.style.bottom !== "auto" && dialog.style.bottom !== "") return false;
            return !dialogPolyfill.isInlinePositionSetByStylesheet(dialog)
        };
        dialogPolyfill.forceRegisterDialog = function(element) {
            if (window.HTMLDialogElement || element.showModal) console.warn("This browser already supports <dialog>, the polyfill " + "may not work correctly", element);
            if (element.localName !== "dialog") throw new Error("Failed to register dialog: The element is not a dialog.");
            new dialogPolyfillInfo((element))
        };
        dialogPolyfill.registerDialog = function(element) {
            if (!element.showModal) dialogPolyfill.forceRegisterDialog(element)
        };
        dialogPolyfill.DialogManager = function() {
            this.pendingDialogStack = [];
            var checkDOM = this.checkDOM_.bind(this);
            this.overlay = document.createElement("div");
            this.overlay.className = "_dialog_overlay";
            this.overlay.addEventListener("click", function(e) {
                this.forwardTab_ = undefined;
                e.stopPropagation();
                checkDOM([])
            }.bind(this));
            this.handleKey_ = this.handleKey_.bind(this);
            this.handleFocus_ = this.handleFocus_.bind(this);
            this.zIndexLow_ = 1E5;
            this.zIndexHigh_ = 1E5 + 150;
            this.forwardTab_ = undefined;
            if ("MutationObserver" in window) this.mo_ = new MutationObserver(function(records) {
                var removed = [];
                records.forEach(function(rec) {
                    for (var i = 0, c; c = rec.removedNodes[i]; ++i) {
                        if (!(c instanceof Element)) continue;
                        else if (c.localName === "dialog") removed.push(c);
                        removed = removed.concat(c.querySelectorAll("dialog"))
                    }
                });
                removed.length && checkDOM(removed)
            })
        };
        dialogPolyfill.DialogManager.prototype.blockDocument =
            function() {
                document.documentElement.addEventListener("focus", this.handleFocus_, true);
                document.addEventListener("keydown", this.handleKey_);
                this.mo_ && this.mo_.observe(document, {
                    childList: true,
                    subtree: true
                })
            };
        dialogPolyfill.DialogManager.prototype.unblockDocument = function() {
            document.documentElement.removeEventListener("focus", this.handleFocus_, true);
            document.removeEventListener("keydown", this.handleKey_);
            this.mo_ && this.mo_.disconnect()
        };
        dialogPolyfill.DialogManager.prototype.updateStacking = function() {
            var zIndex =
                this.zIndexHigh_;
            for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i) {
                dpi.updateZIndex(--zIndex, --zIndex);
                if (i === 0) this.overlay.style.zIndex = --zIndex
            }
            var last = this.pendingDialogStack[0];
            if (last) {
                var p = last.dialog.parentNode || document.body;
                p.appendChild(this.overlay)
            } else if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay)
        };
        dialogPolyfill.DialogManager.prototype.containedByTopDialog_ = function(candidate) {
            while (candidate = findNearestDialog(candidate)) {
                for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i)
                    if (dpi.dialog ===
                        candidate) return i === 0;
                candidate = candidate.parentElement
            }
            return false
        };
        dialogPolyfill.DialogManager.prototype.handleFocus_ = function(event) {
            if (this.containedByTopDialog_(event.target)) return;
            event.preventDefault();
            event.stopPropagation();
            safeBlur((event.target));
            if (this.forwardTab_ === undefined) return;
            var dpi = this.pendingDialogStack[0];
            var dialog = dpi.dialog;
            var position = dialog.compareDocumentPosition(event.target);
            if (position & Node.DOCUMENT_POSITION_PRECEDING)
                if (this.forwardTab_) dpi.focus_();
                else document.documentElement.focus();
            else;
            return false
        };
        dialogPolyfill.DialogManager.prototype.handleKey_ = function(event) {
            this.forwardTab_ = undefined;
            if (event.keyCode === 27) {
                event.preventDefault();
                event.stopPropagation();
                var cancelEvent = new supportCustomEvent("cancel", {
                    bubbles: false,
                    cancelable: true
                });
                var dpi = this.pendingDialogStack[0];
                if (dpi && dpi.dialog.dispatchEvent(cancelEvent)) dpi.dialog.close()
            } else if (event.keyCode === 9) this.forwardTab_ = !event.shiftKey
        };
        dialogPolyfill.DialogManager.prototype.checkDOM_ = function(removed) {
            var clone = this.pendingDialogStack.slice();
            clone.forEach(function(dpi) {
                if (removed.indexOf(dpi.dialog) !== -1) dpi.downgradeModal();
                else dpi.maybeHideModal()
            })
        };
        dialogPolyfill.DialogManager.prototype.pushDialog = function(dpi) {
            var allowed = (this.zIndexHigh_ - this.zIndexLow_) / 2 - 1;
            if (this.pendingDialogStack.length >= allowed) return false;
            if (this.pendingDialogStack.unshift(dpi) === 1) this.blockDocument();
            this.updateStacking();
            return true
        };
        dialogPolyfill.DialogManager.prototype.removeDialog = function(dpi) {
            var index = this.pendingDialogStack.indexOf(dpi);
            if (index ===
                -1) return;
            this.pendingDialogStack.splice(index, 1);
            if (this.pendingDialogStack.length === 0) this.unblockDocument();
            this.updateStacking()
        };
        dialogPolyfill.dm = new dialogPolyfill.DialogManager;
        dialogPolyfill.formSubmitter = null;
        dialogPolyfill.useValue = null;
        if (window.HTMLDialogElement === undefined) {
            var replacementFormSubmit = function() {
                if (!isFormMethodDialog(this)) return nativeFormSubmit.call(this);
                var dialog = findNearestDialog(this);
                dialog && dialog.close()
            };
            var testForm = document.createElement("form");
            testForm.setAttribute("method",
                "dialog");
            if (testForm.method !== "dialog") {
                var methodDescriptor = Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, "method");
                if (methodDescriptor) {
                    var realGet = methodDescriptor.get;
                    methodDescriptor.get = function() {
                        if (isFormMethodDialog(this)) return "dialog";
                        return realGet.call(this)
                    };
                    var realSet = methodDescriptor.set;
                    methodDescriptor.set = function(v) {
                        if (typeof v === "string" && v.toLowerCase() === "dialog") return this.setAttribute("method", v);
                        return realSet.call(this, v)
                    };
                    Object.defineProperty(HTMLFormElement.prototype,
                        "method", methodDescriptor)
                }
            }
            document.addEventListener("click", function(ev) {
                dialogPolyfill.formSubmitter = null;
                dialogPolyfill.useValue = null;
                if (ev.defaultPrevented) return;
                var target = (ev.target);
                if (!target || !isFormMethodDialog(target.form)) return;
                var valid = target.type === "submit" && ["button", "input"].indexOf(target.localName) > -1;
                if (!valid) {
                    if (!(target.localName === "input" && target.type === "image")) return;
                    dialogPolyfill.useValue = ev.offsetX + "," + ev.offsetY
                }
                var dialog = findNearestDialog(target);
                if (!dialog) return;
                dialogPolyfill.formSubmitter = target
            }, false);
            var nativeFormSubmit = HTMLFormElement.prototype.submit;
            HTMLFormElement.prototype.submit = replacementFormSubmit;
            document.addEventListener("submit", function(ev) {
                var form = (ev.target);
                if (!isFormMethodDialog(form)) return;
                ev.preventDefault();
                var dialog = findNearestDialog(form);
                if (!dialog) return;
                var s = dialogPolyfill.formSubmitter;
                if (s && s.form === form) dialog.close(dialogPolyfill.useValue || s.value);
                else dialog.close();
                dialogPolyfill.formSubmitter = null
            }, true)
        }
        dialogPolyfill["forceRegisterDialog"] =
            dialogPolyfill.forceRegisterDialog;
        dialogPolyfill["registerDialog"] = dialogPolyfill.registerDialog;
        if (typeof define === "function" && "amd" in define) define(function() {
            return dialogPolyfill
        });
        else if (typeof module === "object" && typeof module["exports"] === "object") module["exports"] = dialogPolyfill;
        else window["dialogPolyfill"] = dialogPolyfill
    })();
    (function() {
        var h, l = this;

        function m(a) {
            return void 0 !== a
        }

        function aa() {}

        function ba(a) {
            var b = typeof a;
            if ("object" == b)
                if (a) {
                    if (a instanceof Array) return "array";
                    if (a instanceof Object) return b;
                    var c = Object.prototype.toString.call(a);
                    if ("[object Window]" == c) return "object";
                    if ("[object Array]" == c || "number" == typeof a.length && "undefined" != typeof a.splice && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("splice")) return "array";
                    if ("[object Function]" == c || "undefined" != typeof a.call && "undefined" !=
                        typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("call")) return "function"
                } else return "null";
            else if ("function" == b && "undefined" == typeof a.call) return "object";
            return b
        }

        function ca(a) {
            return null != a
        }

        function da(a) {
            return "array" == ba(a)
        }

        function ea(a) {
            var b = ba(a);
            return "array" == b || "object" == b && "number" == typeof a.length
        }

        function n(a) {
            return "string" == typeof a
        }

        function fa(a) {
            return "number" == typeof a
        }

        function ga(a) {
            return "function" == ba(a)
        }

        function ha(a) {
            var b = typeof a;
            return "object" == b && null != a || "function" ==
                b
        }
        var ia = "closure_uid_" + (1E9 * Math.random() >>> 0),
            ja = 0;

        function ka(a, b, c) {
            return a.call.apply(a.bind, arguments)
        }

        function la(a, b, c) {
            if (!a) throw Error();
            if (2 < arguments.length) {
                var d = Array.prototype.slice.call(arguments, 2);
                return function() {
                    var c = Array.prototype.slice.call(arguments);
                    Array.prototype.unshift.apply(c, d);
                    return a.apply(b, c)
                }
            }
            return function() {
                return a.apply(b, arguments)
            }
        }

        function p(a, b, c) {
            p = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? ka : la;
            return p.apply(null,
                arguments)
        }

        function ma(a, b) {
            var c = Array.prototype.slice.call(arguments, 1);
            return function() {
                var b = c.slice();
                b.push.apply(b, arguments);
                return a.apply(this, b)
            }
        }

        function q(a, b) {
            for (var c in b) a[c] = b[c]
        }
        var na = Date.now || function() {
            return +new Date
        };

        function oa(a, b) {
            a = a.split(".");
            var c = l;
            a[0] in c || !c.execScript || c.execScript("var " + a[0]);
            for (var d; a.length && (d = a.shift());) !a.length && m(b) ? c[d] = b : c = c[d] && c[d] !== Object.prototype[d] ? c[d] : c[d] = {}
        }

        function t(a, b) {
            function c() {}
            c.prototype = b.prototype;
            a.h = b.prototype;
            a.prototype = new c;
            a.prototype.constructor = a;
            a.Pe = function(a, c, f) {
                for (var g = Array(arguments.length - 2), k = 2; k < arguments.length; k++) g[k - 2] = arguments[k];
                return b.prototype[c].apply(a, g)
            }
        }

        function pa(a) {
            if (Error.captureStackTrace) Error.captureStackTrace(this, pa);
            else {
                var b = Error().stack;
                b && (this.stack = b)
            }
            a && (this.message = String(a))
        }
        t(pa, Error);
        pa.prototype.name = "CustomError";
        var qa;

        function ra(a, b) {
            for (var c = a.split("%s"), d = "", e = Array.prototype.slice.call(arguments, 1); e.length && 1 < c.length;) d += c.shift() +
                e.shift();
            return d + c.join("%s")
        }
        var sa = String.prototype.trim ? function(a) {
            return a.trim()
        } : function(a) {
            return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
        };

        function ta(a) {
            if (!ua.test(a)) return a; - 1 != a.indexOf("&") && (a = a.replace(va, "&amp;")); - 1 != a.indexOf("<") && (a = a.replace(wa, "&lt;")); - 1 != a.indexOf(">") && (a = a.replace(xa, "&gt;")); - 1 != a.indexOf('"') && (a = a.replace(ya, "&quot;")); - 1 != a.indexOf("'") && (a = a.replace(za, "&#39;")); - 1 != a.indexOf("\x00") && (a = a.replace(Aa, "&#0;"));
            return a
        }
        var va = /&/g,
            wa = /</g,
            xa = />/g,
            ya = /"/g,
            za = /'/g,
            Aa = /\x00/g,
            ua = /[\x00&<>"']/;

        function Ba(a, b) {
            return a < b ? -1 : a > b ? 1 : 0
        }

        function Ca(a, b) {
            b.unshift(a);
            pa.call(this, ra.apply(null, b));
            b.shift()
        }
        t(Ca, pa);
        Ca.prototype.name = "AssertionError";

        function Da(a, b) {
            throw new Ca("Failure" + (a ? ": " + a : ""), Array.prototype.slice.call(arguments, 1));
        }
        var Ea = Array.prototype.indexOf ? function(a, b, c) {
                return Array.prototype.indexOf.call(a, b, c)
            } : function(a, b, c) {
                c = null == c ? 0 : 0 > c ? Math.max(0, a.length + c) : c;
                if (n(a)) return n(b) && 1 == b.length ? a.indexOf(b, c) : -1;
                for (; c < a.length; c++)
                    if (c in
                        a && a[c] === b) return c;
                return -1
            },
            Ga = Array.prototype.forEach ? function(a, b, c) {
                Array.prototype.forEach.call(a, b, c)
            } : function(a, b, c) {
                for (var d = a.length, e = n(a) ? a.split("") : a, f = 0; f < d; f++) f in e && b.call(c, e[f], f, a)
            };

        function Ha(a, b) {
            for (var c = n(a) ? a.split("") : a, d = a.length - 1; 0 <= d; --d) d in c && b.call(void 0, c[d], d, a)
        }
        var Ia = Array.prototype.filter ? function(a, b, c) {
                return Array.prototype.filter.call(a, b, c)
            } : function(a, b, c) {
                for (var d = a.length, e = [], f = 0, g = n(a) ? a.split("") : a, k = 0; k < d; k++)
                    if (k in g) {
                        var r = g[k];
                        b.call(c,
                            r, k, a) && (e[f++] = r)
                    }
                return e
            },
            Ja = Array.prototype.map ? function(a, b, c) {
                return Array.prototype.map.call(a, b, c)
            } : function(a, b, c) {
                for (var d = a.length, e = Array(d), f = n(a) ? a.split("") : a, g = 0; g < d; g++) g in f && (e[g] = b.call(c, f[g], g, a));
                return e
            },
            Ka = Array.prototype.some ? function(a, b, c) {
                return Array.prototype.some.call(a, b, c)
            } : function(a, b, c) {
                for (var d = a.length, e = n(a) ? a.split("") : a, f = 0; f < d; f++)
                    if (f in e && b.call(c, e[f], f, a)) return !0;
                return !1
            };

        function La(a, b, c) {
            for (var d = a.length, e = n(a) ? a.split("") : a, f = 0; f < d; f++)
                if (f in
                    e && b.call(c, e[f], f, a)) return f;
            return -1
        }

        function Ma(a, b) {
            return 0 <= Ea(a, b)
        }

        function Na(a, b) {
            b = Ea(a, b);
            var c;
            (c = 0 <= b) && Oa(a, b);
            return c
        }

        function Oa(a, b) {
            return 1 == Array.prototype.splice.call(a, b, 1).length
        }

        function Pa(a, b) {
            b = La(a, b, void 0);
            0 <= b && Oa(a, b)
        }

        function Qa(a, b) {
            var c = 0;
            Ha(a, function(d, e) {
                b.call(void 0, d, e, a) && Oa(a, e) && c++
            })
        }

        function Ra(a) {
            return Array.prototype.concat.apply([], arguments)
        }

        function Sa(a) {
            var b = a.length;
            if (0 < b) {
                for (var c = Array(b), d = 0; d < b; d++) c[d] = a[d];
                return c
            }
            return []
        }
        var Ta;
        a: {
            var Ua = l.navigator;
            if (Ua) {
                var Va = Ua.userAgent;
                if (Va) {
                    Ta = Va;
                    break a
                }
            }
            Ta = ""
        }

        function u(a) {
            return -1 != Ta.indexOf(a)
        }

        function Wa(a, b, c) {
            for (var d in a) b.call(c, a[d], d, a)
        }

        function Xa(a, b) {
            for (var c in a)
                if (b.call(void 0, a[c], c, a)) return !0;
            return !1
        }

        function Ya(a) {
            var b = [],
                c = 0,
                d;
            for (d in a) b[c++] = a[d];
            return b
        }

        function Za(a) {
            var b = [],
                c = 0,
                d;
            for (d in a) b[c++] = d;
            return b
        }

        function $a(a) {
            var b = {},
                c;
            for (c in a) b[c] = a[c];
            return b
        }
        var ab = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");

        function bb(a, b) {
            for (var c, d, e = 1; e < arguments.length; e++) {
                d = arguments[e];
                for (c in d) a[c] = d[c];
                for (var f = 0; f < ab.length; f++) c = ab[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c])
            }
        }

        function cb(a) {
            var b = arguments.length;
            if (1 == b && da(arguments[0])) return cb.apply(null, arguments[0]);
            for (var c = {}, d = 0; d < b; d++) c[arguments[d]] = !0;
            return c
        }

        function db(a) {
            db[" "](a);
            return a
        }
        db[" "] = aa;

        function eb(a, b) {
            var c = fb;
            return Object.prototype.hasOwnProperty.call(c, a) ? c[a] : c[a] = b(a)
        }
        var gb = u("Opera"),
            v = u("Trident") ||
            u("MSIE"),
            hb = u("Edge"),
            ib = hb || v,
            jb = u("Gecko") && !(-1 != Ta.toLowerCase().indexOf("webkit") && !u("Edge")) && !(u("Trident") || u("MSIE")) && !u("Edge"),
            w = -1 != Ta.toLowerCase().indexOf("webkit") && !u("Edge"),
            kb = w && u("Mobile"),
            lb = u("Macintosh");

        function mb() {
            var a = l.document;
            return a ? a.documentMode : void 0
        }
        var nb;
        a: {
            var ob = "",
                pb = function() {
                    var a = Ta;
                    if (jb) return /rv\:([^\);]+)(\)|;)/.exec(a);
                    if (hb) return /Edge\/([\d\.]+)/.exec(a);
                    if (v) return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);
                    if (w) return /WebKit\/(\S+)/.exec(a);
                    if (gb) return /(?:Version)[ \/]?(\S+)/.exec(a)
                }();pb && (ob = pb ? pb[1] : "");
            if (v) {
                var qb = mb();
                if (null != qb && qb > parseFloat(ob)) {
                    nb = String(qb);
                    break a
                }
            }
            nb = ob
        }
        var fb = {};

        function x(a) {
            return eb(a, function() {
                for (var b = 0, c = sa(String(nb)).split("."), d = sa(String(a)).split("."), e = Math.max(c.length, d.length), f = 0; 0 == b && f < e; f++) {
                    var g = c[f] || "",
                        k = d[f] || "";
                    do {
                        g = /(\d*)(\D*)(.*)/.exec(g) || ["", "", "", ""];
                        k = /(\d*)(\D*)(.*)/.exec(k) || ["", "", "", ""];
                        if (0 == g[0].length && 0 == k[0].length) break;
                        b = Ba(0 == g[1].length ? 0 : parseInt(g[1], 10),
                            0 == k[1].length ? 0 : parseInt(k[1], 10)) || Ba(0 == g[2].length, 0 == k[2].length) || Ba(g[2], k[2]);
                        g = g[3];
                        k = k[3]
                    } while (0 == b)
                }
                return 0 <= b
            })
        }
        var rb = l.document,
            sb = rb && v ? mb() || ("CSS1Compat" == rb.compatMode ? parseInt(nb, 10) : 5) : void 0;
        var tb = !v || 9 <= Number(sb),
            ub = !jb && !v || v && 9 <= Number(sb) || jb && x("1.9.1");
        v && x("9");

        function y(a) {
            this.ze = a
        }
        y.prototype.toString = function() {
            return this.ze
        };
        var vb = new y("A"),
            wb = new y("APPLET"),
            xb = new y("AREA"),
            yb = new y("BASE"),
            zb = new y("BR"),
            Ab = new y("BUTTON"),
            Bb = new y("COL"),
            Cb = new y("COMMAND"),
            Db = new y("DIV"),
            Eb = new y("EMBED"),
            Fb = new y("FRAME"),
            Gb = new y("HEAD"),
            Hb = new y("HR"),
            Ib = new y("IFRAME"),
            Jb = new y("IMG"),
            Kb = new y("INPUT"),
            Lb = new y("ISINDEX"),
            Mb = new y("KEYGEN"),
            Nb = new y("LINK"),
            Ob = new y("MATH"),
            Pb = new y("META"),
            Qb = new y("NOFRAMES"),
            Rb = new y("NOSCRIPT"),
            Sb = new y("OBJECT"),
            Tb = new y("PARAM"),
            Ub = new y("SCRIPT"),
            Vb = new y("SOURCE"),
            Wb = new y("STYLE"),
            Xb = new y("SVG"),
            Yb = new y("TEMPLATE"),
            Zb = new y("TEXTAREA"),
            $b = new y("TRACK"),
            ac = new y("WBR");

        function bc() {
            this.Xb = "";
            this.vd = cc
        }
        bc.prototype.Hb = !0;
        bc.prototype.Bb = function() {
            return this.Xb
        };
        bc.prototype.toString = function() {
            return "Const{" + this.Xb + "}"
        };
        var cc = {};

        function dc(a) {
            var b = new bc;
            b.Xb = a;
            return b
        }
        dc("");

        function ec() {
            this.Qb = "";
            this.wd = fc
        }
        ec.prototype.Hb = !0;
        ec.prototype.Bb = function() {
            return this.Qb
        };
        ec.prototype.lc = function() {
            return 1
        };
        ec.prototype.toString = function() {
            return "TrustedResourceUrl{" + this.Qb + "}"
        };

        function gc() {
            var a = dc("//www.gstatic.com/accountchooser/client.js");
            a instanceof bc && a.constructor === bc && a.vd === cc ? a = a.Xb : (Da("expected object of type Const, got '" +
                a + "'"), a = "type_error:Const");
            var b = new ec;
            b.Qb = a;
            return b
        }
        var fc = {};

        function hc() {
            this.ia = "";
            this.ud = ic
        }
        hc.prototype.Hb = !0;
        hc.prototype.Bb = function() {
            return this.ia
        };
        hc.prototype.lc = function() {
            return 1
        };
        hc.prototype.toString = function() {
            return "SafeUrl{" + this.ia + "}"
        };

        function jc(a) {
            if (a instanceof hc && a.constructor === hc && a.ud === ic) return a.ia;
            Da("expected object of type SafeUrl, got '" + a + "' of type " + ba(a));
            return "type_error:SafeUrl"
        }
        var kc = /^(?:(?:https?|mailto|ftp):|[^&:/?#]*(?:[/?#]|$))/i;

        function lc(a) {
            if (a instanceof hc) return a;
            a = a.Hb ? a.Bb() : String(a);
            kc.test(a) || (a = "about:invalid#zClosurez");
            return mc(a)
        }
        var ic = {};

        function mc(a) {
            var b = new hc;
            b.ia = a;
            return b
        }
        mc("about:blank");

        function nc() {
            this.ia = "";
            this.td = oc;
            this.Nc = null
        }
        nc.prototype.lc = function() {
            return this.Nc
        };
        nc.prototype.Hb = !0;
        nc.prototype.Bb = function() {
            return this.ia
        };
        nc.prototype.toString = function() {
            return "SafeHtml{" + this.ia + "}"
        };

        function pc(a) {
            if (a instanceof nc && a.constructor === nc && a.td === oc) return a.ia;
            Da("expected object of type SafeHtml, got '" +
                a + "' of type " + ba(a));
            return "type_error:SafeHtml"
        }
        cb(wb, yb, Eb, Ib, Nb, Ob, Pb, Sb, Ub, Wb, Xb, Yb);
        var oc = {};
        nc.prototype.ee = function(a) {
            this.ia = a;
            this.Nc = null;
            return this
        };

        function qc(a, b) {
            this.x = m(a) ? a : 0;
            this.y = m(b) ? b : 0
        }
        h = qc.prototype;
        h.clone = function() {
            return new qc(this.x, this.y)
        };
        h.toString = function() {
            return "(" + this.x + ", " + this.y + ")"
        };
        h.ceil = function() {
            this.x = Math.ceil(this.x);
            this.y = Math.ceil(this.y);
            return this
        };
        h.floor = function() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this
        };
        h.round =
            function() {
                this.x = Math.round(this.x);
                this.y = Math.round(this.y);
                return this
            };
        h.translate = function(a, b) {
            a instanceof qc ? (this.x += a.x, this.y += a.y) : (this.x += Number(a), fa(b) && (this.y += b));
            return this
        };
        h.scale = function(a, b) {
            b = fa(b) ? b : a;
            this.x *= a;
            this.y *= b;
            return this
        };

        function rc(a, b) {
            this.width = a;
            this.height = b
        }
        h = rc.prototype;
        h.clone = function() {
            return new rc(this.width, this.height)
        };
        h.toString = function() {
            return "(" + this.width + " x " + this.height + ")"
        };
        h.Ad = function() {
            return this.width * this.height
        };
        h.Jb = function() {
            return !this.Ad()
        };
        h.ceil = function() {
            this.width = Math.ceil(this.width);
            this.height = Math.ceil(this.height);
            return this
        };
        h.floor = function() {
            this.width = Math.floor(this.width);
            this.height = Math.floor(this.height);
            return this
        };
        h.round = function() {
            this.width = Math.round(this.width);
            this.height = Math.round(this.height);
            return this
        };
        h.scale = function(a, b) {
            b = fa(b) ? b : a;
            this.width *= a;
            this.height *= b;
            return this
        };

        function sc(a) {
            return a ? new tc(uc(a)) : qa || (qa = new tc)
        }

        function vc(a, b) {
            var c = b || document;
            return c.querySelectorAll && c.querySelector ?
                c.querySelectorAll("." + a) : wc(a, b)
        }

        function xc(a, b) {
            var c = b || document;
            return (c.getElementsByClassName ? c.getElementsByClassName(a)[0] : c.querySelectorAll && c.querySelector ? c.querySelector("." + a) : wc(a, b)[0]) || null
        }

        function wc(a, b) {
            var c, d, e;
            c = document;
            b = b || c;
            if (b.querySelectorAll && b.querySelector && a) return b.querySelectorAll("" + (a ? "." + a : ""));
            if (a && b.getElementsByClassName) {
                var f = b.getElementsByClassName(a);
                return f
            }
            f = b.getElementsByTagName("*");
            if (a) {
                e = {};
                for (c = d = 0; b = f[c]; c++) {
                    var g = b.className;
                    "function" ==
                    typeof g.split && Ma(g.split(/\s+/), a) && (e[d++] = b)
                }
                e.length = d;
                return e
            }
            return f
        }

        function yc(a, b) {
            Wa(b, function(b, d) {
                "style" == d ? a.style.cssText = b : "class" == d ? a.className = b : "for" == d ? a.htmlFor = b : zc.hasOwnProperty(d) ? a.setAttribute(zc[d], b) : 0 == d.lastIndexOf("aria-", 0) || 0 == d.lastIndexOf("data-", 0) ? a.setAttribute(d, b) : a[d] = b
            })
        }
        var zc = {
            cellpadding: "cellPadding",
            cellspacing: "cellSpacing",
            colspan: "colSpan",
            frameborder: "frameBorder",
            height: "height",
            maxlength: "maxLength",
            nonce: "nonce",
            role: "role",
            rowspan: "rowSpan",
            type: "type",
            usemap: "useMap",
            valign: "vAlign",
            width: "width"
        };

        function Ac(a) {
            return a.scrollingElement ? a.scrollingElement : w || "CSS1Compat" != a.compatMode ? a.body || a.documentElement : a.documentElement
        }

        function Bc(a, b, c, d) {
            function e(c) {
                c && b.appendChild(n(c) ? a.createTextNode(c) : c)
            }
            for (; d < c.length; d++) {
                var f = c[d];
                !ea(f) || ha(f) && 0 < f.nodeType ? e(f) : Ga(Cc(f) ? Sa(f) : f, e)
            }
        }

        function Dc(a) {
            return a && a.parentNode ? a.parentNode.removeChild(a) : null
        }

        function uc(a) {
            return 9 == a.nodeType ? a : a.ownerDocument || a.document
        }

        function Ec(a,
            b) {
            if ("textContent" in a) a.textContent = b;
            else if (3 == a.nodeType) a.data = b;
            else if (a.firstChild && 3 == a.firstChild.nodeType) {
                for (; a.lastChild != a.firstChild;) a.removeChild(a.lastChild);
                a.firstChild.data = b
            } else {
                for (var c; c = a.firstChild;) a.removeChild(c);
                a.appendChild(uc(a).createTextNode(String(b)))
            }
        }

        function Cc(a) {
            if (a && "number" == typeof a.length) {
                if (ha(a)) return "function" == typeof a.item || "string" == typeof a.item;
                if (ga(a)) return "function" == typeof a.item
            }
            return !1
        }

        function Fc(a, b) {
            return b ? Gc(a, function(a) {
                return !b ||
                    n(a.className) && Ma(a.className.split(/\s+/), b)
            }) : null
        }

        function Gc(a, b) {
            for (var c = 0; a;) {
                if (b(a)) return a;
                a = a.parentNode;
                c++
            }
            return null
        }

        function tc(a) {
            this.Y = a || l.document || document
        }
        h = tc.prototype;
        h.Pa = sc;
        h.L = function(a) {
            return n(a) ? this.Y.getElementById(a) : a
        };
        h.getElementsByTagName = function(a, b) {
            return (b || this.Y).getElementsByTagName(String(a))
        };
        h.mc = function(a, b) {
            return vc(a, b || this.Y)
        };
        h.o = function(a, b) {
            return xc(a, b || this.Y)
        };
        h.hc = function(a, b, c) {
            var d = this.Y,
                e = arguments,
                f = String(e[0]),
                g = e[1];
            if (!tb && g && (g.name || g.type)) {
                f = ["<", f];
                g.name && f.push(' name="', ta(g.name), '"');
                if (g.type) {
                    f.push(' type="', ta(g.type), '"');
                    var k = {};
                    bb(k, g);
                    delete k.type;
                    g = k
                }
                f.push(">");
                f = f.join("")
            }
            f = d.createElement(f);
            g && (n(g) ? f.className = g : da(g) ? f.className = g.join(" ") : yc(f, g));
            2 < e.length && Bc(d, f, e, 2);
            return f
        };
        h.createElement = function(a) {
            return this.Y.createElement(String(a))
        };
        h.createTextNode = function(a) {
            return this.Y.createTextNode(String(a))
        };
        h.appendChild = function(a, b) {
            a.appendChild(b)
        };
        h.append = function(a,
            b) {
            Bc(uc(a), a, arguments, 1)
        };
        h.canHaveChildren = function(a) {
            if (1 != a.nodeType) return !1;
            switch (a.tagName) {
                case String(wb):
                case String(xb):
                case String(yb):
                case String(zb):
                case String(Bb):
                case String(Cb):
                case String(Eb):
                case String(Fb):
                case String(Hb):
                case String(Jb):
                case String(Kb):
                case String(Ib):
                case String(Lb):
                case String(Mb):
                case String(Nb):
                case String(Qb):
                case String(Rb):
                case String(Pb):
                case String(Sb):
                case String(Tb):
                case String(Ub):
                case String(Vb):
                case String(Wb):
                case String($b):
                case String(ac):
                    return !1
            }
            return !0
        };
        h.removeNode = Dc;
        h.Rc = function(a) {
            return ub && void 0 != a.children ? a.children : Ia(a.childNodes, function(a) {
                return 1 == a.nodeType
            })
        };
        h.contains = function(a, b) {
            if (!a || !b) return !1;
            if (a.contains && 1 == b.nodeType) return a == b || a.contains(b);
            if ("undefined" != typeof a.compareDocumentPosition) return a == b || !!(a.compareDocumentPosition(b) & 16);
            for (; b && a != b;) b = b.parentNode;
            return b == a
        };
        v && x(8);

        function Hc(a) {
            if (a.R && "function" == typeof a.R) return a.R();
            if (n(a)) return a.split("");
            if (ea(a)) {
                for (var b = [], c = a.length, d = 0; d < c; d++) b.push(a[d]);
                return b
            }
            return Ya(a)
        }

        function Ic(a) {
            if (a.ga && "function" == typeof a.ga) return a.ga();
            if (!a.R || "function" != typeof a.R) {
                if (ea(a) || n(a)) {
                    var b = [];
                    a = a.length;
                    for (var c = 0; c < a; c++) b.push(c);
                    return b
                }
                return Za(a)
            }
        }

        function Jc(a, b, c) {
            if (a.forEach && "function" == typeof a.forEach) a.forEach(b, c);
            else if (ea(a) || n(a)) Ga(a, b, c);
            else
                for (var d = Ic(a), e = Hc(a), f = e.length, g = 0; g < f; g++) b.call(c, e[g], d && d[g], a)
        }
        var Kc = "StopIteration" in l ? l.StopIteration : {
            message: "StopIteration",
            stack: ""
        };

        function Lc() {}
        Lc.prototype.next =
            function() {
                throw Kc;
            };
        Lc.prototype.va = function() {
            return this
        };

        function Mc(a) {
            if (a instanceof Lc) return a;
            if ("function" == typeof a.va) return a.va(!1);
            if (ea(a)) {
                var b = 0,
                    c = new Lc;
                c.next = function() {
                    for (;;) {
                        if (b >= a.length) throw Kc;
                        if (b in a) return a[b++];
                        b++
                    }
                };
                return c
            }
            throw Error("Not implemented");
        }

        function Nc(a, b) {
            if (ea(a)) try {
                Ga(a, b, void 0)
            } catch (c) {
                if (c !== Kc) throw c;
            } else {
                a = Mc(a);
                try {
                    for (;;) b.call(void 0, a.next(), void 0, a)
                } catch (c$1) {
                    if (c$1 !== Kc) throw c$1;
                }
            }
        }

        function Oc(a) {
            if (ea(a)) return Sa(a);
            a =
                Mc(a);
            var b = [];
            Nc(a, function(a) {
                b.push(a)
            });
            return b
        }

        function Pc(a, b) {
            this.V = {};
            this.u = [];
            this.Xa = this.v = 0;
            var c = arguments.length;
            if (1 < c) {
                if (c % 2) throw Error("Uneven number of arguments");
                for (var d = 0; d < c; d += 2) this.set(arguments[d], arguments[d + 1])
            } else a && this.addAll(a)
        }
        h = Pc.prototype;
        h.R = function() {
            Qc(this);
            for (var a = [], b = 0; b < this.u.length; b++) a.push(this.V[this.u[b]]);
            return a
        };
        h.ga = function() {
            Qc(this);
            return this.u.concat()
        };
        h.Ma = function(a) {
            return Rc(this.V, a)
        };
        h.Jb = function() {
            return 0 == this.v
        };
        h.clear = function() {
            this.V = {};
            this.Xa = this.v = this.u.length = 0
        };
        h.remove = function(a) {
            return Rc(this.V, a) ? (delete this.V[a], this.v--, this.Xa++, this.u.length > 2 * this.v && Qc(this), !0) : !1
        };

        function Qc(a) {
            if (a.v != a.u.length) {
                for (var b = 0, c = 0; b < a.u.length;) {
                    var d = a.u[b];
                    Rc(a.V, d) && (a.u[c++] = d);
                    b++
                }
                a.u.length = c
            }
            if (a.v != a.u.length) {
                for (var e = {}, c = b = 0; b < a.u.length;) d = a.u[b], Rc(e, d) || (a.u[c++] = d, e[d] = 1), b++;
                a.u.length = c
            }
        }
        h.get = function(a, b) {
            return Rc(this.V, a) ? this.V[a] : b
        };
        h.set = function(a, b) {
            Rc(this.V, a) || (this.v++,
                this.u.push(a), this.Xa++);
            this.V[a] = b
        };
        h.addAll = function(a) {
            var b;
            a instanceof Pc ? (b = a.ga(), a = a.R()) : (b = Za(a), a = Ya(a));
            for (var c = 0; c < b.length; c++) this.set(b[c], a[c])
        };
        h.forEach = function(a, b) {
            for (var c = this.ga(), d = 0; d < c.length; d++) {
                var e = c[d],
                    f = this.get(e);
                a.call(b, f, e, this)
            }
        };
        h.clone = function() {
            return new Pc(this)
        };
        h.va = function(a) {
            Qc(this);
            var b = 0,
                c = this.Xa,
                d = this,
                e = new Lc;
            e.next = function() {
                if (c != d.Xa) throw Error("The map has changed since the iterator was created");
                if (b >= d.u.length) throw Kc;
                var e =
                    d.u[b++];
                return a ? e : d.V[e]
            };
            return e
        };

        function Rc(a, b) {
            return Object.prototype.hasOwnProperty.call(a, b)
        }
        var Sc = /^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;

        function Tc(a, b) {
            if (a) {
                a = a.split("&");
                for (var c = 0; c < a.length; c++) {
                    var d = a[c].indexOf("="),
                        e, f = null;
                    0 <= d ? (e = a[c].substring(0, d), f = a[c].substring(d + 1)) : e = a[c];
                    b(e, f ? decodeURIComponent(f.replace(/\+/g, " ")) : "")
                }
            }
        }

        function Uc(a, b, c, d) {
            for (var e = c.length; 0 <= (b = a.indexOf(c, b)) &&
                b < d;) {
                var f = a.charCodeAt(b - 1);
                if (38 == f || 63 == f)
                    if (f = a.charCodeAt(b + e), !f || 61 == f || 38 == f || 35 == f) return b;
                b += e + 1
            }
            return -1
        }
        var Vc = /#|$/;

        function Wc(a, b) {
            var c = a.search(Vc),
                d = Uc(a, 0, b, c);
            if (0 > d) return null;
            var e = a.indexOf("&", d);
            if (0 > e || e > c) e = c;
            d += b.length + 1;
            return decodeURIComponent(a.substr(d, e - d).replace(/\+/g, " "))
        }
        var Xc = /[?&]($|#)/;

        function Yc(a, b) {
            this.fa = this.Ka = this.ua = "";
            this.Ta = null;
            this.Aa = this.da = "";
            this.S = this.fe = !1;
            var c;
            a instanceof Yc ? (this.S = m(b) ? b : a.S, Zc(this, a.ua), c = a.Ka, z(this), this.Ka =
                c, c = a.fa, z(this), this.fa = c, $c(this, a.Ta), c = a.da, z(this), this.da = c, ad(this, a.ja.clone()), a = a.Aa, z(this), this.Aa = a) : a && (c = String(a).match(Sc)) ? (this.S = !!b, Zc(this, c[1] || "", !0), a = c[2] || "", z(this), this.Ka = bd(a), a = c[3] || "", z(this), this.fa = bd(a, !0), $c(this, c[4]), a = c[5] || "", z(this), this.da = bd(a, !0), ad(this, c[6] || "", !0), a = c[7] || "", z(this), this.Aa = bd(a)) : (this.S = !!b, this.ja = new cd(null, 0, this.S))
        }
        Yc.prototype.toString = function() {
            var a = [],
                b = this.ua;
            b && a.push(dd(b, ed, !0), ":");
            var c = this.fa;
            if (c || "file" == b) a.push("//"),
                (b = this.Ka) && a.push(dd(b, ed, !0), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.Ta, null != c && a.push(":", String(c));
            if (c = this.da) this.fa && "/" != c.charAt(0) && a.push("/"), a.push(dd(c, "/" == c.charAt(0) ? fd : gd, !0));
            (c = this.ja.toString()) && a.push("?", c);
            (c = this.Aa) && a.push("#", dd(c, hd));
            return a.join("")
        };
        Yc.prototype.resolve = function(a) {
            var b = this.clone(),
                c = !!a.ua;
            c ? Zc(b, a.ua) : c = !!a.Ka;
            if (c) {
                var d = a.Ka;
                z(b);
                b.Ka = d
            } else c = !!a.fa;
            c ? (d = a.fa, z(b), b.fa = d) : c = null != a.Ta;
            d =
                a.da;
            if (c) $c(b, a.Ta);
            else if (c = !!a.da) {
                if ("/" != d.charAt(0))
                    if (this.fa && !this.da) d = "/" + d;
                    else {
                        var e = b.da.lastIndexOf("/"); - 1 != e && (d = b.da.substr(0, e + 1) + d)
                    }
                e = d;
                if (".." == e || "." == e) d = "";
                else if (-1 != e.indexOf("./") || -1 != e.indexOf("/.")) {
                    for (var d = 0 == e.lastIndexOf("/", 0), e = e.split("/"), f = [], g = 0; g < e.length;) {
                        var k = e[g++];
                        "." == k ? d && g == e.length && f.push("") : ".." == k ? ((1 < f.length || 1 == f.length && "" != f[0]) && f.pop(), d && g == e.length && f.push("")) : (f.push(k), d = !0)
                    }
                    d = f.join("/")
                } else d = e
            }
            c ? (z(b), b.da = d) : c = "" !== a.ja.toString();
            c ? ad(b, a.ja.clone()) : c = !!a.Aa;
            c && (a = a.Aa, z(b), b.Aa = a);
            return b
        };
        Yc.prototype.clone = function() {
            return new Yc(this)
        };

        function Zc(a, b, c) {
            z(a);
            a.ua = c ? bd(b, !0) : b;
            a.ua && (a.ua = a.ua.replace(/:$/, ""))
        }

        function $c(a, b) {
            z(a);
            if (b) {
                b = Number(b);
                if (isNaN(b) || 0 > b) throw Error("Bad port number " + b);
                a.Ta = b
            } else a.Ta = null
        }

        function ad(a, b, c) {
            z(a);
            b instanceof cd ? (a.ja = b, a.ja.Cc(a.S)) : (c || (b = dd(b, id)), a.ja = new cd(b, 0, a.S))
        }

        function z(a) {
            if (a.fe) throw Error("Tried to modify a read-only Uri");
        }
        Yc.prototype.Cc = function(a) {
            this.S =
                a;
            this.ja && this.ja.Cc(a);
            return this
        };

        function jd(a) {
            return a instanceof Yc ? a.clone() : new Yc(a, void 0)
        }

        function kd(a) {
            var b = window.location.href;
            b instanceof Yc || (b = jd(b));
            a instanceof Yc || (a = jd(a));
            return b.resolve(a)
        }

        function bd(a, b) {
            return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : ""
        }

        function dd(a, b, c) {
            return n(a) ? (a = encodeURI(a).replace(b, ld), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null
        }

        function ld(a) {
            a = a.charCodeAt(0);
            return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16)
        }
        var ed = /[#\/\?@]/g,
            gd = /[\#\?:]/g,
            fd = /[\#\?]/g,
            id = /[\#\?@]/g,
            hd = /#/g;

        function cd(a, b, c) {
            this.v = this.C = null;
            this.O = a || null;
            this.S = !!c
        }

        function md(a) {
            a.C || (a.C = new Pc, a.v = 0, a.O && Tc(a.O, function(b, c) {
                a.add(decodeURIComponent(b.replace(/\+/g, " ")), c)
            }))
        }
        h = cd.prototype;
        h.add = function(a, b) {
            md(this);
            this.O = null;
            a = nd(this, a);
            var c = this.C.get(a);
            c || this.C.set(a, c = []);
            c.push(b);
            this.v += 1;
            return this
        };
        h.remove = function(a) {
            md(this);
            a = nd(this, a);
            return this.C.Ma(a) ? (this.O = null, this.v -= this.C.get(a).length, this.C.remove(a)) :
                !1
        };
        h.clear = function() {
            this.C = this.O = null;
            this.v = 0
        };
        h.Jb = function() {
            md(this);
            return 0 == this.v
        };
        h.Ma = function(a) {
            md(this);
            a = nd(this, a);
            return this.C.Ma(a)
        };
        h.ga = function() {
            md(this);
            for (var a = this.C.R(), b = this.C.ga(), c = [], d = 0; d < b.length; d++)
                for (var e = a[d], f = 0; f < e.length; f++) c.push(b[d]);
            return c
        };
        h.R = function(a) {
            md(this);
            var b = [];
            if (n(a)) this.Ma(a) && (b = Ra(b, this.C.get(nd(this, a))));
            else {
                a = this.C.R();
                for (var c = 0; c < a.length; c++) b = Ra(b, a[c])
            }
            return b
        };
        h.set = function(a, b) {
            md(this);
            this.O = null;
            a = nd(this,
                a);
            this.Ma(a) && (this.v -= this.C.get(a).length);
            this.C.set(a, [b]);
            this.v += 1;
            return this
        };
        h.get = function(a, b) {
            a = a ? this.R(a) : [];
            return 0 < a.length ? String(a[0]) : b
        };
        h.toString = function() {
            if (this.O) return this.O;
            if (!this.C) return "";
            for (var a = [], b = this.C.ga(), c = 0; c < b.length; c++)
                for (var d = b[c], e = encodeURIComponent(String(d)), d = this.R(d), f = 0; f < d.length; f++) {
                    var g = e;
                    "" !== d[f] && (g += "=" + encodeURIComponent(String(d[f])));
                    a.push(g)
                }
            return this.O = a.join("&")
        };
        h.clone = function() {
            var a = new cd;
            a.O = this.O;
            this.C && (a.C =
                this.C.clone(), a.v = this.v);
            return a
        };

        function nd(a, b) {
            b = String(b);
            a.S && (b = b.toLowerCase());
            return b
        }
        h.Cc = function(a) {
            a && !this.S && (md(this), this.O = null, this.C.forEach(function(a, c) {
                var d = c.toLowerCase();
                c != d && (this.remove(c), this.remove(d), 0 < a.length && (this.O = null, this.C.set(nd(this, d), Sa(a)), this.v += a.length))
            }, this));
            this.S = a
        };
        h.extend = function(a) {
            for (var b = 0; b < arguments.length; b++) Jc(arguments[b], function(a, b) {
                this.add(b, a)
            }, this)
        };
        var od = {
                bf: !0
            },
            pd = {
                df: !0
            },
            qd = {
                cf: !0
            };

        function A() {
            throw Error("Do not instantiate directly");
        }
        A.prototype.oa = null;
        A.prototype.toString = function() {
            return this.content
        };

        function rd(a, b, c, d) {
            a: if (a = a(b || sd, void 0, c), d = (d || sc()).createElement(Db), a = td(a), a.match(ud), d.innerHTML = a, 1 == d.childNodes.length && (a = d.firstChild, 1 == a.nodeType)) {
                d = a;
                break a
            }return d
        }

        function td(a) {
            if (!ha(a)) return String(a);
            if (a instanceof A) {
                if (a.X === od) return a.content;
                if (a.X === qd) return ta(a.content)
            }
            Da("Soy template output is unsafe for use as HTML: " + a);
            return "zSoyz"
        }
        var ud = /^<(body|caption|col|colgroup|head|html|tr|td|th|tbody|thead|tfoot)>/i,
            sd = {};

        function vd(a) {
            if (null != a) switch (a.oa) {
                case 1:
                    return 1;
                case -1:
                    return -1;
                case 0:
                    return 0
            }
            return null
        }

        function wd() {
            A.call(this)
        }
        t(wd, A);
        wd.prototype.X = od;

        function B(a) {
            return null != a && a.X === od ? a : a instanceof nc ? C(pc(a), a.lc()) : C(ta(String(String(a))), vd(a))
        }

        function xd() {
            A.call(this)
        }
        t(xd, A);
        xd.prototype.X = {
            af: !0
        };
        xd.prototype.oa = 1;

        function yd() {
            A.call(this)
        }
        t(yd, A);
        yd.prototype.X = pd;
        yd.prototype.oa = 1;

        function zd() {
            A.call(this)
        }
        t(zd, A);
        zd.prototype.X = {
            $e: !0
        };
        zd.prototype.oa = 1;

        function Ad() {
            A.call(this)
        }
        t(Ad, A);
        Ad.prototype.X = {
            Ze: !0
        };
        Ad.prototype.oa = 1;

        function Bd(a, b) {
            this.content = String(a);
            this.oa = null != b ? b : null
        }
        t(Bd, A);
        Bd.prototype.X = qd;

        function Cd(a) {
            function b(a) {
                this.content = a
            }
            b.prototype = a.prototype;
            return function(a) {
                return new b(String(a))
            }
        }

        function D(a) {
            return new Bd(a, void 0)
        }
        var C = function(a) {
            function b(a) {
                this.content = a
            }
            b.prototype = a.prototype;
            return function(a, d) {
                a = new b(String(a));
                void 0 !== d && (a.oa = d);
                return a
            }
        }(wd);
        Cd(xd);
        var Dd = Cd(yd);
        Cd(zd);
        Cd(Ad);

        function Ed(a) {
            var b = {
                label: Fd("New password")
            };

            function c() {}
            c.prototype = a;
            a = new c;
            for (var d in b) a[d] = b[d];
            return a
        }

        function Fd(a) {
            return (a = String(a)) ? new Bd(a, void 0) : ""
        }
        var Gd = function(a) {
            function b(a) {
                this.content = a
            }
            b.prototype = a.prototype;
            return function(a, d) {
                a = String(a);
                if (!a) return "";
                a = new b(a);
                void 0 !== d && (a.oa = d);
                return a
            }
        }(wd);

        function Hd(a) {
            return null != a && a.X === od ? String(String(a.content).replace(Id, "").replace(Jd, "&lt;")).replace(Kd, Ld) : ta(String(a))
        }

        function Md(a) {
            null != a && a.X === pd ? a = String(a).replace(Nd, Od) : a instanceof hc ? a = String(jc(a)).replace(Nd,
                Od) : (a = String(a), Pd.test(a) ? a = a.replace(Nd, Od) : (Da("Bad value `%s` for |filterNormalizeUri", [a]), a = "#zSoyz"));
            return a
        }
        var Qd = {
            "\x00": "&#0;",
            "\t": "&#9;",
            "\n": "&#10;",
            "\x0B": "&#11;",
            "\f": "&#12;",
            "\r": "&#13;",
            " ": "&#32;",
            '"': "&quot;",
            "&": "&amp;",
            "'": "&#39;",
            "-": "&#45;",
            "/": "&#47;",
            "<": "&lt;",
            "=": "&#61;",
            ">": "&gt;",
            "`": "&#96;",
            "\u0085": "&#133;",
            "\u00a0": "&#160;",
            "\u2028": "&#8232;",
            "\u2029": "&#8233;"
        };

        function Ld(a) {
            return Qd[a]
        }
        var Rd = {
            "\x00": "%00",
            "\u0001": "%01",
            "\u0002": "%02",
            "\u0003": "%03",
            "\u0004": "%04",
            "\u0005": "%05",
            "\u0006": "%06",
            "\u0007": "%07",
            "\b": "%08",
            "\t": "%09",
            "\n": "%0A",
            "\x0B": "%0B",
            "\f": "%0C",
            "\r": "%0D",
            "\u000e": "%0E",
            "\u000f": "%0F",
            "\u0010": "%10",
            "\u0011": "%11",
            "\u0012": "%12",
            "\u0013": "%13",
            "\u0014": "%14",
            "\u0015": "%15",
            "\u0016": "%16",
            "\u0017": "%17",
            "\u0018": "%18",
            "\u0019": "%19",
            "\u001a": "%1A",
            "\u001b": "%1B",
            "\u001c": "%1C",
            "\u001d": "%1D",
            "\u001e": "%1E",
            "\u001f": "%1F",
            " ": "%20",
            '"': "%22",
            "'": "%27",
            "(": "%28",
            ")": "%29",
            "<": "%3C",
            ">": "%3E",
            "\\": "%5C",
            "{": "%7B",
            "}": "%7D",
            "\u007f": "%7F",
            "\u0085": "%C2%85",
            "\u00a0": "%C2%A0",
            "\u2028": "%E2%80%A8",
            "\u2029": "%E2%80%A9",
            "\uff01": "%EF%BC%81",
            "\uff03": "%EF%BC%83",
            "\uff04": "%EF%BC%84",
            "\uff06": "%EF%BC%86",
            "\uff07": "%EF%BC%87",
            "\uff08": "%EF%BC%88",
            "\uff09": "%EF%BC%89",
            "\uff0a": "%EF%BC%8A",
            "\uff0b": "%EF%BC%8B",
            "\uff0c": "%EF%BC%8C",
            "\uff0f": "%EF%BC%8F",
            "\uff1a": "%EF%BC%9A",
            "\uff1b": "%EF%BC%9B",
            "\uff1d": "%EF%BC%9D",
            "\uff1f": "%EF%BC%9F",
            "\uff20": "%EF%BC%A0",
            "\uff3b": "%EF%BC%BB",
            "\uff3d": "%EF%BC%BD"
        };

        function Od(a) {
            return Rd[a]
        }
        var Kd = /[\x00\x22\x27\x3c\x3e]/g,
            Nd =
            /[\x00- \x22\x27-\x29\x3c\x3e\\\x7b\x7d\x7f\x85\xa0\u2028\u2029\uff01\uff03\uff04\uff06-\uff0c\uff0f\uff1a\uff1b\uff1d\uff1f\uff20\uff3b\uff3d]/g,
            Pd = /^(?![^#?]*\/(?:\.|%2E){2}(?:[\/?#]|$))(?:(?:https?|mailto):|[^&:\/?#]*(?:[\/?#]|$))/i,
            Id = /<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g,
            Jd = /</g;

        function Sd(a) {
            a.prototype.then = a.prototype.then;
            a.prototype.$goog_Thenable = !0
        }

        function Td(a) {
            if (!a) return !1;
            try {
                return !!a.$goog_Thenable
            } catch (b) {
                return !1
            }
        }

        function Ud(a, b, c) {
            this.ge = c;
            this.Gd =
                a;
            this.se = b;
            this.Nb = 0;
            this.Fb = null
        }
        Ud.prototype.get = function() {
            var a;
            0 < this.Nb ? (this.Nb--, a = this.Fb, this.Fb = a.next, a.next = null) : a = this.Gd();
            return a
        };
        Ud.prototype.put = function(a) {
            this.se(a);
            this.Nb < this.ge && (this.Nb++, a.next = this.Fb, this.Fb = a)
        };

        function Vd() {
            this.$b = this.Ya = null
        }
        var Xd = new Ud(function() {
            return new Wd
        }, function(a) {
            a.reset()
        }, 100);
        Vd.prototype.add = function(a, b) {
            var c = Xd.get();
            c.set(a, b);
            this.$b ? this.$b.next = c : this.Ya = c;
            this.$b = c
        };
        Vd.prototype.remove = function() {
            var a = null;
            this.Ya && (a =
                this.Ya, this.Ya = this.Ya.next, this.Ya || (this.$b = null), a.next = null);
            return a
        };

        function Wd() {
            this.next = this.scope = this.kc = null
        }
        Wd.prototype.set = function(a, b) {
            this.kc = a;
            this.scope = b;
            this.next = null
        };
        Wd.prototype.reset = function() {
            this.next = this.scope = this.kc = null
        };

        function Yd(a) {
            l.setTimeout(function() {
                throw a;
            }, 0)
        }
        var Zd;

        function $d() {
            var a = l.MessageChannel;
            "undefined" === typeof a && "undefined" !== typeof window && window.postMessage && window.addEventListener && !u("Presto") && (a = function() {
                var a = document.createElement(String(Ib));
                a.style.display = "none";
                a.src = "";
                document.documentElement.appendChild(a);
                var b = a.contentWindow,
                    a = b.document;
                a.open();
                a.write("");
                a.close();
                var c = "callImmediate" + Math.random(),
                    d = "file:" == b.location.protocol ? "*" : b.location.protocol + "//" + b.location.host,
                    a = p(function(a) {
                        if (("*" == d || a.origin == d) && a.data == c) this.port1.onmessage()
                    }, this);
                b.addEventListener("message", a, !1);
                this.port1 = {};
                this.port2 = {
                    postMessage: function() {
                        b.postMessage(c, d)
                    }
                }
            });
            if ("undefined" !== typeof a && !u("Trident") && !u("MSIE")) {
                var b = new a,
                    c = {},
                    d = c;
                b.port1.onmessage = function() {
                    if (m(c.next)) {
                        c = c.next;
                        var a = c.Jc;
                        c.Jc = null;
                        a()
                    }
                };
                return function(a) {
                    d.next = {
                        Jc: a
                    };
                    d = d.next;
                    b.port2.postMessage(0)
                }
            }
            return "undefined" !== typeof document && "onreadystatechange" in document.createElement(String(Ub)) ? function(a) {
                var b = document.createElement(String(Ub));
                b.onreadystatechange = function() {
                    b.onreadystatechange = null;
                    b.parentNode.removeChild(b);
                    b = null;
                    a();
                    a = null
                };
                document.documentElement.appendChild(b)
            } : function(a) {
                l.setTimeout(a, 0)
            }
        }

        function ae(a, b) {
            be || ce();
            de || (be(), de = !0);
            ee.add(a, b)
        }
        var be;

        function ce() {
            if (-1 != String(l.Promise).indexOf("[native code]")) {
                var a = l.Promise.resolve(void 0);
                be = function() {
                    a.then(fe)
                }
            } else be = function() {
                var a = fe;
                !ga(l.setImmediate) || l.Window && l.Window.prototype && !u("Edge") && l.Window.prototype.setImmediate == l.setImmediate ? (Zd || (Zd = $d()), Zd(a)) : l.setImmediate(a)
            }
        }
        var de = !1,
            ee = new Vd;

        function fe() {
            for (var a; a = ee.remove();) {
                try {
                    a.kc.call(a.scope)
                } catch (b) {
                    Yd(b)
                }
                Xd.put(a)
            }
            de = !1
        }

        function ge(a, b) {
            this.W = he;
            this.ka = void 0;
            this.La =
                this.la = this.s = null;
            this.Cb = this.jc = !1;
            if (a != aa) try {
                var c = this;
                a.call(b, function(a) {
                    ie(c, je, a)
                }, function(a) {
                    if (!(a instanceof ke)) try {
                        if (a instanceof Error) throw a;
                        throw Error("Promise rejected.");
                    } catch (b$2) {}
                    ie(c, le, a)
                })
            } catch (d) {
                ie(this, le, d)
            }
        }
        var he = 0,
            je = 2,
            le = 3;

        function me() {
            this.next = this.context = this.Ra = this.mb = this.xa = null;
            this.tb = !1
        }
        me.prototype.reset = function() {
            this.context = this.Ra = this.mb = this.xa = null;
            this.tb = !1
        };
        var ne = new Ud(function() {
            return new me
        }, function(a) {
            a.reset()
        }, 100);

        function oe(a,
            b, c) {
            var d = ne.get();
            d.mb = a;
            d.Ra = b;
            d.context = c;
            return d
        }

        function pe(a) {
            if (a instanceof ge) return a;
            var b = new ge(aa);
            ie(b, je, a);
            return b
        }

        function qe(a) {
            return new ge(function(b, c) {
                c(a)
            })
        }
        ge.prototype.then = function(a, b, c) {
            return re(this, ga(a) ? a : null, ga(b) ? b : null, c)
        };
        Sd(ge);

        function se(a, b) {
            return re(a, null, b, void 0)
        }
        ge.prototype.cancel = function(a) {
            this.W == he && ae(function() {
                var b = new ke(a);
                te(this, b)
            }, this)
        };

        function te(a, b) {
            if (a.W == he)
                if (a.s) {
                    var c = a.s;
                    if (c.la) {
                        for (var d = 0, e = null, f = null, g = c.la; g && (g.tb ||
                                (d++, g.xa == a && (e = g), !(e && 1 < d))); g = g.next) e || (f = g);
                        e && (c.W == he && 1 == d ? te(c, b) : (f ? (d = f, d.next == c.La && (c.La = d), d.next = d.next.next) : ue(c), ve(c, e, le, b)))
                    }
                    a.s = null
                } else ie(a, le, b)
        }

        function we(a, b) {
            a.la || a.W != je && a.W != le || xe(a);
            a.La ? a.La.next = b : a.la = b;
            a.La = b
        }

        function re(a, b, c, d) {
            var e = oe(null, null, null);
            e.xa = new ge(function(a, g) {
                e.mb = b ? function(c) {
                    try {
                        var e = b.call(d, c);
                        a(e)
                    } catch (N) {
                        g(N)
                    }
                } : a;
                e.Ra = c ? function(b) {
                    try {
                        var e = c.call(d, b);
                        !m(e) && b instanceof ke ? g(b) : a(e)
                    } catch (N) {
                        g(N)
                    }
                } : g
            });
            e.xa.s = a;
            we(a, e);
            return e.xa
        }
        ge.prototype.De = function(a) {
            this.W = he;
            ie(this, je, a)
        };
        ge.prototype.Ee = function(a) {
            this.W = he;
            ie(this, le, a)
        };

        function ie(a, b, c) {
            if (a.W == he) {
                a === c && (b = le, c = new TypeError("Promise cannot resolve to itself"));
                a.W = 1;
                var d;
                a: {
                    var e = c,
                        f = a.De,
                        g = a.Ee;
                    if (e instanceof ge) we(e, oe(f || aa, g || null, a)),
                    d = !0;
                    else if (Td(e)) e.then(f, g, a),
                    d = !0;
                    else {
                        if (ha(e)) try {
                            var k = e.then;
                            if (ga(k)) {
                                ye(e, k, f, g, a);
                                d = !0;
                                break a
                            }
                        } catch (r) {
                            g.call(a, r);
                            d = !0;
                            break a
                        }
                        d = !1
                    }
                }
                d || (a.ka = c, a.W = b, a.s = null, xe(a), b != le || c instanceof ke || ze(a, c))
            }
        }

        function ye(a,
            b, c, d, e) {
            function f(a) {
                k || (k = !0, d.call(e, a))
            }

            function g(a) {
                k || (k = !0, c.call(e, a))
            }
            var k = !1;
            try {
                b.call(a, g, f)
            } catch (r) {
                f(r)
            }
        }

        function xe(a) {
            a.jc || (a.jc = !0, ae(a.Nd, a))
        }

        function ue(a) {
            var b = null;
            a.la && (b = a.la, a.la = b.next, b.next = null);
            a.la || (a.La = null);
            return b
        }
        ge.prototype.Nd = function() {
            for (var a; a = ue(this);) ve(this, a, this.W, this.ka);
            this.jc = !1
        };

        function ve(a, b, c, d) {
            if (c == le && b.Ra && !b.tb)
                for (; a && a.Cb; a = a.s) a.Cb = !1;
            if (b.xa) b.xa.s = null, Ae(b, c, d);
            else try {
                b.tb ? b.mb.call(b.context) : Ae(b, c, d)
            } catch (e) {
                Be.call(null,
                    e)
            }
            ne.put(b)
        }

        function Ae(a, b, c) {
            b == je ? a.mb.call(a.context, c) : a.Ra && a.Ra.call(a.context, c)
        }

        function ze(a, b) {
            a.Cb = !0;
            ae(function() {
                a.Cb && Be.call(null, b)
            })
        }
        var Be = Yd;

        function ke(a) {
            pa.call(this, a)
        }
        t(ke, pa);
        ke.prototype.name = "cancel";

        function Ce() {
            0 != De && (Ee[this[ia] || (this[ia] = ++ja)] = this);
            this.Na = this.Na;
            this.Ga = this.Ga
        }
        var De = 0,
            Ee = {};
        Ce.prototype.Na = !1;
        Ce.prototype.i = function() {
            if (!this.Na && (this.Na = !0, this.f(), 0 != De)) {
                var a = this[ia] || (this[ia] = ++ja);
                delete Ee[a]
            }
        };

        function Fe(a, b) {
            a.Na ? m(void 0) ?
                b.call(void 0) : b() : (a.Ga || (a.Ga = []), a.Ga.push(m(void 0) ? p(b, void 0) : b))
        }
        Ce.prototype.f = function() {
            if (this.Ga)
                for (; this.Ga.length;) this.Ga.shift()()
        };

        function Ge(a) {
            a && "function" == typeof a.i && a.i()
        }
        var He = !v || 9 <= Number(sb),
            Ie = v && !x("9");
        !w || x("528");
        jb && x("1.9b") || v && x("8") || gb && x("9.5") || w && x("528");
        jb && !x("8") || v && x("9");

        function Je(a, b) {
            this.type = a;
            this.currentTarget = this.target = b;
            this.defaultPrevented = this.Ha = !1;
            this.jd = !0
        }
        Je.prototype.stopPropagation = function() {
            this.Ha = !0
        };
        Je.prototype.preventDefault =
            function() {
                this.defaultPrevented = !0;
                this.jd = !1
            };

        function E(a, b) {
            Je.call(this, a ? a.type : "");
            this.relatedTarget = this.currentTarget = this.target = null;
            this.button = this.screenY = this.screenX = this.clientY = this.clientX = this.offsetY = this.offsetX = 0;
            this.key = "";
            this.charCode = this.keyCode = 0;
            this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
            this.$ = this.state = null;
            a && this.init(a, b)
        }
        t(E, Je);
        E.prototype.init = function(a, b) {
            var c = this.type = a.type,
                d = a.changedTouches ? a.changedTouches[0] : null;
            this.target = a.target ||
                a.srcElement;
            this.currentTarget = b;
            if (b = a.relatedTarget) {
                if (jb) {
                    var e;
                    a: {
                        try {
                            db(b.nodeName);
                            e = !0;
                            break a
                        } catch (f) {}
                        e = !1
                    }
                    e || (b = null)
                }
            } else "mouseover" == c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);
            this.relatedTarget = b;
            null === d ? (this.offsetX = w || void 0 !== a.offsetX ? a.offsetX : a.layerX, this.offsetY = w || void 0 !== a.offsetY ? a.offsetY : a.layerY, this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0) : (this.clientX =
                void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0);
            this.button = a.button;
            this.keyCode = a.keyCode || 0;
            this.key = a.key || "";
            this.charCode = a.charCode || ("keypress" == c ? a.keyCode : 0);
            this.ctrlKey = a.ctrlKey;
            this.altKey = a.altKey;
            this.shiftKey = a.shiftKey;
            this.metaKey = a.metaKey;
            this.state = a.state;
            this.$ = a;
            a.defaultPrevented && this.preventDefault()
        };
        E.prototype.stopPropagation = function() {
            E.h.stopPropagation.call(this);
            this.$.stopPropagation ?
                this.$.stopPropagation() : this.$.cancelBubble = !0
        };
        E.prototype.preventDefault = function() {
            E.h.preventDefault.call(this);
            var a = this.$;
            if (a.preventDefault) a.preventDefault();
            else if (a.returnValue = !1, Ie) try {
                if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode) a.keyCode = -1
            } catch (b) {}
        };
        var Ke = "closure_listenable_" + (1E6 * Math.random() | 0);

        function Le(a) {
            return !(!a || !a[Ke])
        }
        var Me = 0;

        function Ne(a, b, c, d, e) {
            this.listener = a;
            this.Rb = null;
            this.src = b;
            this.type = c;
            this.Za = !!d;
            this.Eb = e;
            this.key = ++Me;
            this.Ua = this.ub = !1
        }

        function Oe(a) {
            a.Ua = !0;
            a.listener = null;
            a.Rb = null;
            a.src = null;
            a.Eb = null
        }

        function Pe(a) {
            this.src = a;
            this.K = {};
            this.sb = 0
        }
        h = Pe.prototype;
        h.add = function(a, b, c, d, e) {
            var f = a.toString();
            a = this.K[f];
            a || (a = this.K[f] = [], this.sb++);
            var g = Qe(a, b, d, e); - 1 < g ? (b = a[g], c || (b.ub = !1)) : (b = new Ne(b, this.src, f, !!d, e), b.ub = c, a.push(b));
            return b
        };
        h.remove = function(a, b, c, d) {
            a = a.toString();
            if (!(a in this.K)) return !1;
            var e = this.K[a];
            b = Qe(e, b, c, d);
            return -1 < b ? (Oe(e[b]), Oa(e, b), 0 == e.length && (delete this.K[a], this.sb--), !0) : !1
        };

        function Re(a, b) {
            var c =
                b.type;
            c in a.K && Na(a.K[c], b) && (Oe(b), 0 == a.K[c].length && (delete a.K[c], a.sb--))
        }
        h.Sb = function(a) {
            a = a && a.toString();
            var b = 0,
                c;
            for (c in this.K)
                if (!a || c == a) {
                    for (var d = this.K[c], e = 0; e < d.length; e++) ++b, Oe(d[e]);
                    delete this.K[c];
                    this.sb--
                }
            return b
        };
        h.fb = function(a, b, c, d) {
            a = this.K[a.toString()];
            var e = -1;
            a && (e = Qe(a, b, c, d));
            return -1 < e ? a[e] : null
        };
        h.hasListener = function(a, b) {
            var c = m(a),
                d = c ? a.toString() : "",
                e = m(b);
            return Xa(this.K, function(a) {
                for (var g = 0; g < a.length; ++g)
                    if (!(c && a[g].type != d || e && a[g].Za != b)) return !0;
                return !1
            })
        };

        function Qe(a, b, c, d) {
            for (var e = 0; e < a.length; ++e) {
                var f = a[e];
                if (!f.Ua && f.listener == b && f.Za == !!c && f.Eb == d) return e
            }
            return -1
        }
        var Se = "closure_lm_" + (1E6 * Math.random() | 0),
            Te = {},
            Ue = 0;

        function Ve(a, b, c, d, e) {
            if (da(b)) {
                for (var f = 0; f < b.length; f++) Ve(a, b[f], c, d, e);
                return null
            }
            c = We(c);
            return Le(a) ? a.ra(b, c, d, e) : Xe(a, b, c, !1, d, e)
        }

        function Xe(a, b, c, d, e, f) {
            if (!b) throw Error("Invalid event type");
            var g = !!e,
                k = Ye(a);
            k || (a[Se] = k = new Pe(a));
            c = k.add(b, c, d, e, f);
            if (c.Rb) return c;
            d = Ze();
            c.Rb = d;
            d.src = a;
            d.listener =
                c;
            if (a.addEventListener) a.addEventListener(b.toString(), d, g);
            else if (a.attachEvent) a.attachEvent($e(b.toString()), d);
            else throw Error("addEventListener and attachEvent are unavailable.");
            Ue++;
            return c
        }

        function Ze() {
            var a = af,
                b = He ? function(c) {
                    return a.call(b.src, b.listener, c)
                } : function(c) {
                    c = a.call(b.src, b.listener, c);
                    if (!c) return c
                };
            return b
        }

        function bf(a, b, c, d, e) {
            if (da(b)) {
                for (var f = 0; f < b.length; f++) bf(a, b[f], c, d, e);
                return null
            }
            c = We(c);
            return Le(a) ? a.Wc(b, c, d, e) : Xe(a, b, c, !0, d, e)
        }

        function cf(a, b, c,
            d, e) {
            if (da(b))
                for (var f = 0; f < b.length; f++) cf(a, b[f], c, d, e);
            else c = We(c), Le(a) ? a.Gc(b, c, d, e) : a && (a = Ye(a)) && (b = a.fb(b, c, !!d, e)) && df(b)
        }

        function df(a) {
            if (fa(a) || !a || a.Ua) return;
            var b = a.src;
            if (Le(b)) {
                Re(b.Z, a);
                return
            }
            var c = a.type,
                d = a.Rb;
            b.removeEventListener ? b.removeEventListener(c, d, a.Za) : b.detachEvent && b.detachEvent($e(c), d);
            Ue--;
            (c = Ye(b)) ? (Re(c, a), 0 == c.sb && (c.src = null, b[Se] = null)) : Oe(a)
        }

        function $e(a) {
            return a in Te ? Te[a] : Te[a] = "on" + a
        }

        function ef(a, b, c, d) {
            var e = !0;
            if (a = Ye(a))
                if (b = a.K[b.toString()])
                    for (b =
                        b.concat(), a = 0; a < b.length; a++) {
                        var f = b[a];
                        f && f.Za == c && !f.Ua && (f = ff(f, d), e = e && !1 !== f)
                    }
            return e
        }

        function ff(a, b) {
            var c = a.listener,
                d = a.Eb || a.src;
            a.ub && df(a);
            return c.call(d, b)
        }

        function af(a, b) {
            if (a.Ua) return !0;
            if (!He) {
                if (!b) a: {
                    b = ["window", "event"];
                    for (var c = l, d; d = b.shift();)
                        if (null != c[d]) c = c[d];
                        else {
                            b = null;
                            break a
                        }
                    b = c
                }
                d = b;
                b = new E(d, this);
                c = !0;
                if (!(0 > d.keyCode || void 0 != d.returnValue)) {
                    a: {
                        var e = !1;
                        if (0 == d.keyCode) try {
                            d.keyCode = -1;
                            break a
                        } catch (g) {
                            e = !0
                        }
                        if (e || void 0 == d.returnValue) d.returnValue = !0
                    }
                    d = [];
                    for (e = b.currentTarget; e; e = e.parentNode) d.push(e);a = a.type;
                    for (e = d.length - 1; !b.Ha && 0 <= e; e--) {
                        b.currentTarget = d[e];
                        var f = ef(d[e], a, !0, b),
                            c = c && f
                    }
                    for (e = 0; !b.Ha && e < d.length; e++) b.currentTarget = d[e],
                    f = ef(d[e], a, !1, b),
                    c = c && f
                }
                return c
            }
            return ff(a, new E(b, this))
        }

        function Ye(a) {
            a = a[Se];
            return a instanceof Pe ? a : null
        }
        var gf = "__closure_events_fn_" + (1E9 * Math.random() >>> 0);

        function We(a) {
            if (ga(a)) return a;
            a[gf] || (a[gf] = function(b) {
                return a.handleEvent(b)
            });
            return a[gf]
        }

        function F() {
            Ce.call(this);
            this.Z = new Pe(this);
            this.xd = this;
            this.Pb = null
        }
        t(F, Ce);
        F.prototype[Ke] = !0;
        h = F.prototype;
        h.Dc = function(a) {
            this.Pb = a
        };
        h.addEventListener = function(a, b, c, d) {
            Ve(this, a, b, c, d)
        };
        h.removeEventListener = function(a, b, c, d) {
            cf(this, a, b, c, d)
        };
        h.dispatchEvent = function(a) {
            var b, c = this.Pb;
            if (c)
                for (b = []; c; c = c.Pb) b.push(c);
            var c = this.xd,
                d = a.type || a;
            if (n(a)) a = new Je(a, c);
            else if (a instanceof Je) a.target = a.target || c;
            else {
                var e = a;
                a = new Je(d, c);
                bb(a, e)
            }
            var e = !0,
                f;
            if (b)
                for (var g = b.length - 1; !a.Ha && 0 <= g; g--) f = a.currentTarget = b[g], e = hf(f, d, !0,
                    a) && e;
            a.Ha || (f = a.currentTarget = c, e = hf(f, d, !0, a) && e, a.Ha || (e = hf(f, d, !1, a) && e));
            if (b)
                for (g = 0; !a.Ha && g < b.length; g++) f = a.currentTarget = b[g], e = hf(f, d, !1, a) && e;
            return e
        };
        h.f = function() {
            F.h.f.call(this);
            this.Z && this.Z.Sb(void 0);
            this.Pb = null
        };
        h.ra = function(a, b, c, d) {
            return this.Z.add(String(a), b, !1, c, d)
        };
        h.Wc = function(a, b, c, d) {
            return this.Z.add(String(a), b, !0, c, d)
        };
        h.Gc = function(a, b, c, d) {
            return this.Z.remove(String(a), b, c, d)
        };

        function hf(a, b, c, d) {
            b = a.Z.K[String(b)];
            if (!b) return !0;
            b = b.concat();
            for (var e = !0,
                    f = 0; f < b.length; ++f) {
                var g = b[f];
                if (g && !g.Ua && g.Za == c) {
                    var k = g.listener,
                        r = g.Eb || g.src;
                    g.ub && Re(a.Z, g);
                    e = !1 !== k.call(r, d) && e
                }
            }
            return e && 0 != d.jd
        }
        h.fb = function(a, b, c, d) {
            return this.Z.fb(String(a), b, c, d)
        };
        h.hasListener = function(a, b) {
            return this.Z.hasListener(m(a) ? String(a) : void 0, b)
        };

        function jf(a, b) {
            F.call(this);
            this.jb = a || 1;
            this.Wa = b || l;
            this.dc = p(this.Be, this);
            this.xc = na()
        }
        t(jf, F);
        h = jf.prototype;
        h.enabled = !1;
        h.H = null;
        h.setInterval = function(a) {
            this.jb = a;
            this.H && this.enabled ? (this.stop(), this.start()) :
                this.H && this.stop()
        };
        h.Be = function() {
            if (this.enabled) {
                var a = na() - this.xc;
                0 < a && a < .8 * this.jb ? this.H = this.Wa.setTimeout(this.dc, this.jb - a) : (this.H && (this.Wa.clearTimeout(this.H), this.H = null), this.dispatchEvent("tick"), this.enabled && (this.H = this.Wa.setTimeout(this.dc, this.jb), this.xc = na()))
            }
        };
        h.start = function() {
            this.enabled = !0;
            this.H || (this.H = this.Wa.setTimeout(this.dc, this.jb), this.xc = na())
        };
        h.stop = function() {
            this.enabled = !1;
            this.H && (this.Wa.clearTimeout(this.H), this.H = null)
        };
        h.f = function() {
            jf.h.f.call(this);
            this.stop();
            delete this.Wa
        };

        function kf(a, b) {
            if (ga(a)) b && (a = p(a, b));
            else if (a && "function" == typeof a.handleEvent) a = p(a.handleEvent, a);
            else throw Error("Invalid listener argument");
            return 2147483647 < Number(0) ? -1 : l.setTimeout(a, 0)
        }

        function lf(a) {
            a = String(a);
            if (/^\s*$/.test(a) ? 0 : /^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g, "@").replace(/(?:"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)[\s\u2028\u2029]*(?=:|,|]|}|$)/g, "]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,
                    ""))) try {
                return eval("(" + a + ")")
            } catch (b) {}
            throw Error("Invalid JSON string: " + a);
        }

        function mf(a) {
            var b = [];
            nf(new of , a, b);
            return b.join("")
        }

        function of () {
            this.Tb = void 0
        }

        function nf(a, b, c) {
            if (null == b) c.push("null");
            else {
                if ("object" == typeof b) {
                    if (da(b)) {
                        var d = b;
                        b = d.length;
                        c.push("[");
                        for (var e = "", f = 0; f < b; f++) c.push(e), e = d[f], nf(a, a.Tb ? a.Tb.call(d, String(f), e) : e, c), e = ",";
                        c.push("]");
                        return
                    }
                    if (b instanceof String || b instanceof Number || b instanceof Boolean) b = b.valueOf();
                    else {
                        c.push("{");
                        f = "";
                        for (d in b) Object.prototype.hasOwnProperty.call(b,
                            d) && (e = b[d], "function" != typeof e && (c.push(f), pf(d, c), c.push(":"), nf(a, a.Tb ? a.Tb.call(b, d, e) : e, c), f = ","));
                        c.push("}");
                        return
                    }
                }
                switch (typeof b) {
                    case "string":
                        pf(b, c);
                        break;
                    case "number":
                        c.push(isFinite(b) && !isNaN(b) ? String(b) : "null");
                        break;
                    case "boolean":
                        c.push(String(b));
                        break;
                    case "function":
                        c.push("null");
                        break;
                    default:
                        throw Error("Unknown type: " + typeof b);
                }
            }
        }
        var qf = {
                '"': '\\"',
                "\\": "\\\\",
                "/": "\\/",
                "\b": "\\b",
                "\f": "\\f",
                "\n": "\\n",
                "\r": "\\r",
                "\t": "\\t",
                "\x0B": "\\u000b"
            },
            rf = /\uffff/.test("\uffff") ?
            /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;

        function pf(a, b) {
            b.push('"', a.replace(rf, function(a) {
                var b = qf[a];
                b || (b = "\\u" + (a.charCodeAt(0) | 65536).toString(16).substr(1), qf[a] = b);
                return b
            }), '"')
        }

        function sf(a, b, c, d, e) {
            this.reset(a, b, c, d, e)
        }
        sf.prototype.ic = null;
        var tf = 0;
        sf.prototype.reset = function(a, b, c, d, e) {
            "number" == typeof e || tf++;
            this.qd = d || na();
            this.Fa = a;
            this.Zc = b;
            this.Yc = c;
            delete this.ic
        };
        sf.prototype.ld = function(a) {
            this.Fa = a
        };

        function uf(a) {
            this.$c = a;
            this.ib = this.na = this.Fa = this.s =
                null
        }

        function vf(a, b) {
            this.name = a;
            this.value = b
        }
        vf.prototype.toString = function() {
            return this.name
        };
        var wf = new vf("SHOUT", 1200),
            xf = new vf("SEVERE", 1E3),
            yf = new vf("WARNING", 900),
            zf = new vf("INFO", 800),
            Af = new vf("CONFIG", 700);
        h = uf.prototype;
        h.getName = function() {
            return this.$c
        };
        h.getParent = function() {
            return this.s
        };
        h.Rc = function() {
            this.na || (this.na = {});
            return this.na
        };
        h.ld = function(a) {
            this.Fa = a
        };

        function Bf(a) {
            if (a.Fa) return a.Fa;
            if (a.s) return Bf(a.s);
            Da("Root logger has no level set.");
            return null
        }
        h.log =
            function(a, b, c) {
                if (a.value >= Bf(this).value)
                    for (ga(b) && (b = b()), a = new sf(a, String(b), this.$c), c && (a.ic = c), c = "log:" + a.Zc, l.console && (l.console.timeStamp ? l.console.timeStamp(c) : l.console.markTimeline && l.console.markTimeline(c)), l.msWriteProfilerMark && l.msWriteProfilerMark(c), c = this; c;) {
                        b = c;
                        var d = a;
                        if (b.ib)
                            for (var e = 0, f; f = b.ib[e]; e++) f(d);
                        c = c.getParent()
                    }
            };

        function Cf(a) {
            Df.log(xf, a, void 0)
        }
        h.info = function(a, b) {
            this.log(zf, a, b)
        };
        var Ef = {},
            Ff = null;

        function Gf() {
            Ff || (Ff = new uf(""), Ef[""] = Ff, Ff.ld(Af))
        }

        function Hf(a) {
            Gf();
            var b;
            if (!(b = Ef[a])) {
                b = new uf(a);
                var c = a.lastIndexOf("."),
                    d = a.substr(c + 1),
                    c = Hf(a.substr(0, c));
                c.Rc()[d] = b;
                b.s = c;
                Ef[a] = b
            }
            return b
        }

        function If() {
            this.hd = na()
        }
        var Jf = new If;
        If.prototype.set = function(a) {
            this.hd = a
        };
        If.prototype.reset = function() {
            this.set(na())
        };
        If.prototype.get = function() {
            return this.hd
        };

        function Kf(a) {
            this.ta = a || "";
            this.ye = Jf
        }
        h = Kf.prototype;
        h.Ic = !0;
        h.md = !0;
        h.ue = !0;
        h.te = !0;
        h.nd = !1;
        h.we = !1;

        function Lf(a) {
            return 10 > a ? "0" + a : String(a)
        }

        function Mf(a, b) {
            a = (a.qd - b) / 1E3;
            b = a.toFixed(3);
            var c = 0;
            if (1 > a) c = 2;
            else
                for (; 100 > a;) c++, a *= 10;
            for (; 0 < c--;) b = " " + b;
            return b
        }

        function Nf(a) {
            Kf.call(this, a)
        }
        t(Nf, Kf);

        function Of() {
            this.pe = p(this.yd, this);
            this.zb = new Nf;
            this.zb.md = !1;
            this.zb.nd = !1;
            this.Vc = this.zb.Ic = !1;
            this.Xc = "";
            this.Pd = {}
        }
        Of.prototype.yd = function(a) {
            if (!this.Pd[a.Yc]) {
                var b;
                b = this.zb;
                var c = [];
                c.push(b.ta, " ");
                if (b.md) {
                    var d = new Date(a.qd);
                    c.push("[", Lf(d.getFullYear() - 2E3) + Lf(d.getMonth() + 1) + Lf(d.getDate()) + " " + Lf(d.getHours()) + ":" + Lf(d.getMinutes()) + ":" + Lf(d.getSeconds()) + "." + Lf(Math.floor(d.getMilliseconds() /
                        10)), "] ")
                }
                b.ue && c.push("[", Mf(a, b.ye.get()), "s] ");
                b.te && c.push("[", a.Yc, "] ");
                b.we && c.push("[", a.Fa.name, "] ");
                c.push(a.Zc);
                b.nd && (d = a.ic) && c.push("\n", d instanceof Error ? d.message : d.toString());
                b.Ic && c.push("\n");
                b = c.join("");
                if (c = Pf) switch (a.Fa) {
                    case wf:
                        Qf(c, "info", b);
                        break;
                    case xf:
                        Qf(c, "error", b);
                        break;
                    case yf:
                        Qf(c, "warn", b);
                        break;
                    default:
                        Qf(c, "debug", b)
                } else this.Xc += b
            }
        };
        var Pf = l.console;

        function Qf(a, b, c) {
            if (a[b]) a[b](c);
            else a.log(c)
        }

        function Rf(a) {
            if (a.altKey && !a.ctrlKey || a.metaKey || 112 <=
                a.keyCode && 123 >= a.keyCode) return !1;
            switch (a.keyCode) {
                case 18:
                case 20:
                case 93:
                case 17:
                case 40:
                case 35:
                case 27:
                case 36:
                case 45:
                case 37:
                case 224:
                case 91:
                case 144:
                case 12:
                case 34:
                case 33:
                case 19:
                case 255:
                case 44:
                case 39:
                case 145:
                case 16:
                case 38:
                case 252:
                case 224:
                case 92:
                    return !1;
                case 0:
                    return !jb;
                default:
                    return 166 > a.keyCode || 183 < a.keyCode
            }
        }

        function Sf(a, b, c, d, e, f) {
            if (!(v || hb || w && x("525"))) return !0;
            if (lb && e) return Tf(a);
            if (e && !d) return !1;
            fa(b) && (b = Uf(b));
            e = 17 == b || 18 == b || lb && 91 == b;
            if ((!c || lb) && e || lb && 16 ==
                b && (d || f)) return !1;
            if ((w || hb) && d && c) switch (a) {
                case 220:
                case 219:
                case 221:
                case 192:
                case 186:
                case 189:
                case 187:
                case 188:
                case 190:
                case 191:
                case 192:
                case 222:
                    return !1
            }
            if (v && d && b == a) return !1;
            switch (a) {
                case 13:
                    return !0;
                case 27:
                    return !(w || hb)
            }
            return Tf(a)
        }

        function Tf(a) {
            if (48 <= a && 57 >= a || 96 <= a && 106 >= a || 65 <= a && 90 >= a || (w || hb) && 0 == a) return !0;
            switch (a) {
                case 32:
                case 43:
                case 63:
                case 64:
                case 107:
                case 109:
                case 110:
                case 111:
                case 186:
                case 59:
                case 189:
                case 187:
                case 61:
                case 188:
                case 190:
                case 191:
                case 192:
                case 222:
                case 219:
                case 220:
                case 221:
                    return !0;
                default:
                    return !1
            }
        }

        function Uf(a) {
            if (jb) a = Vf(a);
            else if (lb && w) a: switch (a) {
                case 93:
                    a = 91;
                    break a
            }
            return a
        }

        function Vf(a) {
            switch (a) {
                case 61:
                    return 187;
                case 59:
                    return 186;
                case 173:
                    return 189;
                case 224:
                    return 91;
                case 0:
                    return 224;
                default:
                    return a
            }
        }

        function Wf(a, b, c, d) {
            this.top = a;
            this.right = b;
            this.bottom = c;
            this.left = d
        }
        h = Wf.prototype;
        h.clone = function() {
            return new Wf(this.top, this.right, this.bottom, this.left)
        };
        h.toString = function() {
            return "(" + this.top + "t, " + this.right + "r, " + this.bottom + "b, " + this.left + "l)"
        };
        h.contains = function(a) {
            return this && a ? a instanceof Wf ? a.left >= this.left && a.right <= this.right && a.top >= this.top && a.bottom <= this.bottom : a.x >= this.left && a.x <= this.right && a.y >= this.top && a.y <= this.bottom : !1
        };
        h.expand = function(a, b, c, d) {
            ha(a) ? (this.top -= a.top, this.right += a.right, this.bottom += a.bottom, this.left -= a.left) : (this.top -= a, this.right += Number(b), this.bottom += Number(c), this.left -= Number(d));
            return this
        };
        h.ceil = function() {
            this.top = Math.ceil(this.top);
            this.right = Math.ceil(this.right);
            this.bottom = Math.ceil(this.bottom);
            this.left = Math.ceil(this.left);
            return this
        };
        h.floor = function() {
            this.top = Math.floor(this.top);
            this.right = Math.floor(this.right);
            this.bottom = Math.floor(this.bottom);
            this.left = Math.floor(this.left);
            return this
        };
        h.round = function() {
            this.top = Math.round(this.top);
            this.right = Math.round(this.right);
            this.bottom = Math.round(this.bottom);
            this.left = Math.round(this.left);
            return this
        };
        h.translate = function(a, b) {
            a instanceof qc ? (this.left += a.x, this.right += a.x, this.top += a.y, this.bottom += a.y) : (this.left += a, this.right +=
                a, fa(b) && (this.top += b, this.bottom += b));
            return this
        };
        h.scale = function(a, b) {
            b = fa(b) ? b : a;
            this.left *= a;
            this.right *= a;
            this.top *= b;
            this.bottom *= b;
            return this
        };

        function Xf(a, b) {
            var c = uc(a);
            return c.defaultView && c.defaultView.getComputedStyle && (a = c.defaultView.getComputedStyle(a, null)) ? a[b] || a.getPropertyValue(b) || "" : ""
        }

        function Yf(a) {
            var b;
            try {
                b = a.getBoundingClientRect()
            } catch (c) {
                return {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0
                }
            }
            v && a.ownerDocument.body && (a = a.ownerDocument, b.left -= a.documentElement.clientLeft + a.body.clientLeft,
                b.top -= a.documentElement.clientTop + a.body.clientTop);
            return b
        }

        function Zf(a, b) {
            b = b || Ac(document);
            var c;
            c = b || Ac(document);
            var d = $f(a),
                e = $f(c),
                f;
            if (!v || 9 <= Number(sb)) g = Xf(c, "borderLeftWidth"), f = Xf(c, "borderRightWidth"), k = Xf(c, "borderTopWidth"), r = Xf(c, "borderBottomWidth"), f = new Wf(parseFloat(k), parseFloat(f), parseFloat(r), parseFloat(g));
            else {
                var g = ag(c, "borderLeft");
                f = ag(c, "borderRight");
                var k = ag(c, "borderTop"),
                    r = ag(c, "borderBottom");
                f = new Wf(k, f, r, g)
            }
            c == Ac(document) ? (g = d.x - c.scrollLeft, d = d.y - c.scrollTop, !v || 10 <= Number(sb) || (g += f.left, d += f.top)) : (g = d.x - e.x - f.left, d = d.y - e.y - f.top);
            e = a.offsetWidth;
            f = a.offsetHeight;
            k = w && !e && !f;
            m(e) && !k || !a.getBoundingClientRect ? a = new rc(e, f) : (a = Yf(a), a = new rc(a.right - a.left, a.bottom - a.top));
            e = c.clientHeight - a.height;
            f = c.scrollLeft;
            k = c.scrollTop;
            f += Math.min(g, Math.max(g - (c.clientWidth - a.width), 0));
            k += Math.min(d, Math.max(d - e, 0));
            c = new qc(f, k);
            b.scrollLeft = c.x;
            b.scrollTop = c.y
        }

        function $f(a) {
            var b = uc(a),
                c = new qc(0, 0),
                d;
            d = b ? uc(b) : document;
            d = !v || 9 <= Number(sb) || "CSS1Compat" ==
                sc(d).Y.compatMode ? d.documentElement : d.body;
            if (a == d) return c;
            a = Yf(a);
            d = sc(b).Y;
            b = Ac(d);
            d = d.parentWindow || d.defaultView;
            b = v && x("10") && d.pageYOffset != b.scrollTop ? new qc(b.scrollLeft, b.scrollTop) : new qc(d.pageXOffset || b.scrollLeft, d.pageYOffset || b.scrollTop);
            c.x = a.left + b.x;
            c.y = a.top + b.y;
            return c
        }
        var bg = {
            thin: 2,
            medium: 4,
            thick: 6
        };

        function ag(a, b) {
            if ("none" == (a.currentStyle ? a.currentStyle[b + "Style"] : null)) return 0;
            var c = a.currentStyle ? a.currentStyle[b + "Width"] : null;
            if (c in bg) a = bg[c];
            else if (/^\d+px?$/.test(c)) a =
                parseInt(c, 10);
            else {
                b = a.style.left;
                var d = a.runtimeStyle.left;
                a.runtimeStyle.left = a.currentStyle.left;
                a.style.left = c;
                c = a.style.pixelLeft;
                a.style.left = b;
                a.runtimeStyle.left = d;
                a = +c
            }
            return a
        }

        function cg(a, b) {
            this.Ub = [];
            this.ad = a;
            this.Lc = b || null;
            this.hb = this.Oa = !1;
            this.ka = void 0;
            this.Ec = this.Bd = this.cc = !1;
            this.Yb = 0;
            this.s = null;
            this.ec = 0
        }
        cg.prototype.cancel = function(a) {
            if (this.Oa) this.ka instanceof cg && this.ka.cancel();
            else {
                if (this.s) {
                    var b = this.s;
                    delete this.s;
                    a ? b.cancel(a) : (b.ec--, 0 >= b.ec && b.cancel())
                }
                this.ad ?
                    this.ad.call(this.Lc, this) : this.Ec = !0;
                this.Oa || (a = new dg, eg(this), fg(this, !1, a))
            }
        };
        cg.prototype.Kc = function(a, b) {
            this.cc = !1;
            fg(this, a, b)
        };

        function fg(a, b, c) {
            a.Oa = !0;
            a.ka = c;
            a.hb = !b;
            gg(a)
        }

        function eg(a) {
            if (a.Oa) {
                if (!a.Ec) throw new hg;
                a.Ec = !1
            }
        }

        function ig(a, b, c) {
            a.Ub.push([b, c, void 0]);
            a.Oa && gg(a)
        }
        cg.prototype.then = function(a, b, c) {
            var d, e, f = new ge(function(a, b) {
                d = a;
                e = b
            });
            ig(this, d, function(a) {
                a instanceof dg ? f.cancel() : e(a)
            });
            return f.then(a, b, c)
        };
        Sd(cg);

        function jg(a) {
            return Ka(a.Ub, function(a) {
                return ga(a[1])
            })
        }

        function gg(a) {
            if (a.Yb && a.Oa && jg(a)) {
                var b = a.Yb,
                    c = kg[b];
                c && (l.clearTimeout(c.Ca), delete kg[b]);
                a.Yb = 0
            }
            a.s && (a.s.ec--, delete a.s);
            for (var b = a.ka, d = c = !1; a.Ub.length && !a.cc;) {
                var e = a.Ub.shift(),
                    f = e[0],
                    g = e[1],
                    e = e[2];
                if (f = a.hb ? g : f) try {
                    var k = f.call(e || a.Lc, b);
                    m(k) && (a.hb = a.hb && (k == b || k instanceof Error), a.ka = b = k);
                    if (Td(b) || "function" === typeof l.Promise && b instanceof l.Promise) d = !0, a.cc = !0
                } catch (r) {
                    b = r, a.hb = !0, jg(a) || (c = !0)
                }
            }
            a.ka = b;
            d && (k = p(a.Kc, a, !0), d = p(a.Kc, a, !1), b instanceof cg ? (ig(b, k, d), b.Bd = !0) : b.then(k,
                d));
            c && (b = new lg(b), kg[b.Ca] = b, a.Yb = b.Ca)
        }

        function hg() {
            pa.call(this)
        }
        t(hg, pa);
        hg.prototype.message = "Deferred has already fired";
        hg.prototype.name = "AlreadyCalledError";

        function dg() {
            pa.call(this)
        }
        t(dg, pa);
        dg.prototype.message = "Deferred was canceled";
        dg.prototype.name = "CanceledError";

        function lg(a) {
            this.Ca = l.setTimeout(p(this.Ae, this), 0);
            this.Md = a
        }
        lg.prototype.Ae = function() {
            delete kg[this.Ca];
            throw this.Md;
        };
        var kg = {};

        function mg(a) {
            Ce.call(this);
            this.sc = a;
            this.u = {}
        }
        t(mg, Ce);
        var ng = [];
        h = mg.prototype;
        h.ra = function(a, b, c, d) {
            da(b) || (b && (ng[0] = b.toString()), b = ng);
            for (var e = 0; e < b.length; e++) {
                var f = Ve(a, b[e], c || this.handleEvent, d || !1, this.sc || this);
                if (!f) break;
                this.u[f.key] = f
            }
            return this
        };
        h.Wc = function(a, b, c, d) {
            return og(this, a, b, c, d)
        };

        function og(a, b, c, d, e, f) {
            if (da(c))
                for (var g = 0; g < c.length; g++) og(a, b, c[g], d, e, f);
            else {
                b = bf(b, c, d || a.handleEvent, e, f || a.sc || a);
                if (!b) return a;
                a.u[b.key] = b
            }
            return a
        }
        h.Gc = function(a, b, c, d, e) {
            if (da(b))
                for (var f = 0; f < b.length; f++) this.Gc(a, b[f], c, d, e);
            else c = c || this.handleEvent,
                e = e || this.sc || this, c = We(c), d = !!d, b = Le(a) ? a.fb(b, c, d, e) : a ? (a = Ye(a)) ? a.fb(b, c, d, e) : null : null, b && (df(b), delete this.u[b.key]);
            return this
        };
        h.Sb = function() {
            Wa(this.u, function(a, b) {
                this.u.hasOwnProperty(b) && df(a)
            }, this);
            this.u = {}
        };
        h.f = function() {
            mg.h.f.call(this);
            this.Sb()
        };
        h.handleEvent = function() {
            throw Error("EventHandler.handleEvent not implemented");
        };

        function pg() {}
        pg.ca = void 0;
        pg.Qd = function() {
            return pg.ca ? pg.ca : pg.ca = new pg
        };
        pg.prototype.je = 0;

        function qg(a) {
            F.call(this);
            this.bb = a || sc();
            this.Ca =
                null;
            this.Da = !1;
            this.j = null;
            this.pa = void 0;
            this.vb = this.na = this.s = null;
            this.Ge = !1
        }
        t(qg, F);
        h = qg.prototype;
        h.$d = pg.Qd();
        h.L = function() {
            return this.j
        };
        h.mc = function(a) {
            return this.j ? this.bb.mc(a, this.j) : []
        };
        h.o = function(a) {
            return this.j ? this.bb.o(a, this.j) : null
        };

        function rg(a) {
            a.pa || (a.pa = new mg(a));
            return a.pa
        }
        h.getParent = function() {
            return this.s
        };
        h.Dc = function(a) {
            if (this.s && this.s != a) throw Error("Method not supported");
            qg.h.Dc.call(this, a)
        };
        h.Pa = function() {
            return this.bb
        };
        h.hc = function() {
            this.j = this.bb.createElement(Db)
        };
        h.render = function(a) {
            if (this.Da) throw Error("Component already rendered");
            this.j || this.hc();
            a ? a.insertBefore(this.j, null) : this.bb.Y.body.appendChild(this.j);
            this.s && !this.s.Da || this.m()
        };
        h.m = function() {
            this.Da = !0;
            sg(this, function(a) {
                !a.Da && a.L() && a.m()
            })
        };
        h.eb = function() {
            sg(this, function(a) {
                a.Da && a.eb()
            });
            this.pa && this.pa.Sb();
            this.Da = !1
        };
        h.f = function() {
            this.Da && this.eb();
            this.pa && (this.pa.i(), delete this.pa);
            sg(this, function(a) {
                a.i()
            });
            !this.Ge && this.j && Dc(this.j);
            this.s = this.j = this.vb = this.na = null;
            qg.h.f.call(this)
        };

        function sg(a, b) {
            a.na && Ga(a.na, b, void 0)
        }
        h.removeChild = function(a, b) {
            if (a) {
                var c = n(a) ? a : a.Ca || (a.Ca = ":" + (a.$d.je++).toString(36));
                this.vb && c ? (a = this.vb, a = (null !== a && c in a ? a[c] : void 0) || null) : a = null;
                if (c && a) {
                    var d = this.vb;
                    c in d && delete d[c];
                    Na(this.na, a);
                    b && (a.eb(), a.j && Dc(a.j));
                    b = a;
                    if (null == b) throw Error("Unable to set parent component");
                    b.s = null;
                    qg.h.Dc.call(b, null)
                }
            }
            if (!a) throw Error("Child is not in parent component");
            return a
        };

        function tg(a) {
            if (a.classList) return a.classList;
            a = a.className;
            return n(a) && a.match(/\S+/g) || []
        }

        function ug(a, b) {
            return a.classList ? a.classList.contains(b) : Ma(tg(a), b)
        }

        function vg(a, b) {
            a.classList ? a.classList.add(b) : ug(a, b) || (a.className += 0 < a.className.length ? " " + b : b)
        }

        function wg(a, b) {
            a.classList ? a.classList.remove(b) : ug(a, b) && (a.className = Ia(tg(a), function(a) {
                return a != b
            }).join(" "))
        }

        function xg(a, b) {
            F.call(this);
            a && (this.Lb && this.detach(), this.j = a, this.Kb = Ve(this.j, "keypress", this, b), this.wc = Ve(this.j, "keydown", this.Db, b, this), this.Lb = Ve(this.j,
                "keyup", this.Yd, b, this))
        }
        t(xg, F);
        h = xg.prototype;
        h.j = null;
        h.Kb = null;
        h.wc = null;
        h.Lb = null;
        h.P = -1;
        h.qa = -1;
        h.bc = !1;
        var yg = {
                3: 13,
                12: 144,
                63232: 38,
                63233: 40,
                63234: 37,
                63235: 39,
                63236: 112,
                63237: 113,
                63238: 114,
                63239: 115,
                63240: 116,
                63241: 117,
                63242: 118,
                63243: 119,
                63244: 120,
                63245: 121,
                63246: 122,
                63247: 123,
                63248: 44,
                63272: 46,
                63273: 36,
                63275: 35,
                63276: 33,
                63277: 34,
                63289: 144,
                63302: 45
            },
            zg = {
                Up: 38,
                Down: 40,
                Left: 37,
                Right: 39,
                Enter: 13,
                F1: 112,
                F2: 113,
                F3: 114,
                F4: 115,
                F5: 116,
                F6: 117,
                F7: 118,
                F8: 119,
                F9: 120,
                F10: 121,
                F11: 122,
                F12: 123,
                "U+007F": 46,
                Home: 36,
                End: 35,
                PageUp: 33,
                PageDown: 34,
                Insert: 45
            },
            Ag = v || hb || w && x("525"),
            Bg = lb && jb;
        h = xg.prototype;
        h.Db = function(a) {
            if (w || hb)
                if (17 == this.P && !a.ctrlKey || 18 == this.P && !a.altKey || lb && 91 == this.P && !a.metaKey) this.qa = this.P = -1; - 1 == this.P && (a.ctrlKey && 17 != a.keyCode ? this.P = 17 : a.altKey && 18 != a.keyCode ? this.P = 18 : a.metaKey && 91 != a.keyCode && (this.P = 91));
            Ag && !Sf(a.keyCode, this.P, a.shiftKey, a.ctrlKey, a.altKey, a.metaKey) ? this.handleEvent(a) : (this.qa = Uf(a.keyCode), Bg && (this.bc = a.altKey))
        };
        h.Yd = function(a) {
            this.qa = this.P = -1;
            this.bc = a.altKey
        };
        h.handleEvent = function(a) {
            var b = a.$,
                c, d, e = b.altKey;
            v && "keypress" == a.type ? (c = this.qa, d = 13 != c && 27 != c ? b.keyCode : 0) : (w || hb) && "keypress" == a.type ? (c = this.qa, d = 0 <= b.charCode && 63232 > b.charCode && Tf(c) ? b.charCode : 0) : gb && !w ? (c = this.qa, d = Tf(c) ? b.keyCode : 0) : (c = b.keyCode || this.qa, d = b.charCode || 0, Bg && (e = this.bc), lb && 63 == d && 224 == c && (c = 191));
            var f = c = Uf(c);
            c ? 63232 <= c && c in yg ? f = yg[c] : 25 == c && a.shiftKey && (f = 9) : b.keyIdentifier && b.keyIdentifier in zg && (f = zg[b.keyIdentifier]);
            a = f == this.P;
            this.P = f;
            b =
                new Cg(f, d, a, b);
            b.altKey = e;
            this.dispatchEvent(b)
        };
        h.L = function() {
            return this.j
        };
        h.detach = function() {
            this.Kb && (df(this.Kb), df(this.wc), df(this.Lb), this.Lb = this.wc = this.Kb = null);
            this.j = null;
            this.qa = this.P = -1
        };
        h.f = function() {
            xg.h.f.call(this);
            this.detach()
        };

        function Cg(a, b, c, d) {
            E.call(this, d);
            this.type = "key";
            this.keyCode = a;
            this.charCode = b;
            this.repeat = c
        }
        t(Cg, E);
        var Dg = !v && !(u("Safari") && !((u("Chrome") || u("CriOS")) && !u("Edge") || u("Coast") || u("Opera") || u("Edge") || u("Silk") || u("Android")));

        function Eg(a,
            b) {
            return Dg && a.dataset ? b in a.dataset ? a.dataset[b] : null : a.getAttribute("data-" + String(b).replace(/([A-Z])/g, "-$1").toLowerCase())
        }

        function G(a) {
            var b = a.type;
            if (!m(b)) return null;
            switch (b.toLowerCase()) {
                case "checkbox":
                case "radio":
                    return a.checked ? a.value : null;
                case "select-one":
                    return b = a.selectedIndex, 0 <= b ? a.options[b].value : null;
                case "select-multiple":
                    for (var b = [], c, d = 0; c = a.options[d]; d++) c.selected && b.push(c.value);
                    return b.length ? b : null;
                default:
                    return m(a.value) ? a.value : null
            }
        }

        function Fg(a, b) {
            var c;
            try {
                c = "number" == typeof a.selectionStart
            } catch (d) {
                c = !1
            }
            c ? (a.selectionStart = b, a.selectionEnd = b) : v && !x("9") && ("textarea" == a.type && (b = a.value.substring(0, b).replace(/(\r\n|\r|\n)/g, "\n").length), a = a.createTextRange(), a.collapse(!0), a.move("character", b), a.select())
        }

        function Gg(a) {
            F.call(this);
            this.j = a;
            Ve(a, Hg, this.Db, !1, this);
            Ve(a, "click", this.Uc, !1, this)
        }
        t(Gg, F);
        var Hg = jb ? "keypress" : "keydown";
        Gg.prototype.Db = function(a) {
            (13 == a.keyCode || w && 3 == a.keyCode) && Ig(this, a)
        };
        Gg.prototype.Uc = function(a) {
            Ig(this,
                a)
        };

        function Ig(a, b) {
            var c = new Jg(b);
            if (a.dispatchEvent(c)) {
                c = new Kg(b);
                try {
                    a.dispatchEvent(c)
                } finally {
                    b.stopPropagation()
                }
            }
        }
        Gg.prototype.f = function() {
            Gg.h.f.call(this);
            cf(this.j, Hg, this.Db, !1, this);
            cf(this.j, "click", this.Uc, !1, this);
            delete this.j
        };

        function Kg(a) {
            E.call(this, a.$);
            this.type = "action"
        }
        t(Kg, E);

        function Jg(a) {
            E.call(this, a.$);
            this.type = "beforeaction"
        }
        t(Jg, E);

        function Lg(a) {
            F.call(this);
            this.j = a;
            a = v ? "focusout" : "blur";
            this.he = Ve(this.j, v ? "focusin" : "focus", this, !v);
            this.ie = Ve(this.j, a, this, !v)
        }
        t(Lg, F);
        Lg.prototype.handleEvent = function(a) {
            var b = new E(a.$);
            b.type = "focusin" == a.type || "focus" == a.type ? "focusin" : "focusout";
            this.dispatchEvent(b)
        };
        Lg.prototype.f = function() {
            Lg.h.f.call(this);
            df(this.he);
            df(this.ie);
            delete this.j
        };

        function Mg(a) {
            F.call(this);
            this.H = null;
            this.j = a;
            a = v || hb || w && !x("531") && a.tagName == Zb;
            this.Qc = new mg(this);
            this.Qc.ra(this.j, a ? ["keydown", "paste", "cut", "drop", "input"] : "input", this)
        }
        t(Mg, F);
        Mg.prototype.handleEvent = function(a) {
            if ("input" == a.type) v && x(10) && 0 == a.keyCode &&
                0 == a.charCode || (Ng(this), this.dispatchEvent(Og(a)));
            else if ("keydown" != a.type || Rf(a)) {
                var b = "keydown" == a.type ? this.j.value : null;
                v && 229 == a.keyCode && (b = null);
                var c = Og(a);
                Ng(this);
                this.H = kf(function() {
                    this.H = null;
                    this.j.value != b && this.dispatchEvent(c)
                }, this)
            }
        };

        function Ng(a) {
            null != a.H && (l.clearTimeout(a.H), a.H = null)
        }

        function Og(a) {
            a = new E(a.$);
            a.type = "input";
            return a
        }
        Mg.prototype.f = function() {
            Mg.h.f.call(this);
            this.Qc.i();
            Ng(this);
            delete this.j
        };
        var Pg = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;

        function Qg(a) {
            var b = {},
                c = b.document || document,
                d;
            a instanceof ec && a.constructor === ec && a.wd === fc ? d = a.Qb : (Da("expected object of type TrustedResourceUrl, got '" + a + "' of type " + ba(a)), d = "type_error:TrustedResourceUrl");
            var e = document.createElement(String(Ub));
            a = {
                kd: e,
                rd: void 0
            };
            var f = new cg(Rg, a),
                g = null,
                k = null != b.timeout ? b.timeout : 5E3;
            0 < k && (g = window.setTimeout(function() {
                Sg(e, !0);
                var a = new Tg(Ug, "Timeout reached for loading script " + d);
                eg(f);
                fg(f, !1, a)
            }, k), a.rd = g);
            e.onload = e.onreadystatechange = function() {
                e.readyState &&
                    "loaded" != e.readyState && "complete" != e.readyState || (Sg(e, b.Se || !1, g), eg(f), fg(f, !0, null))
            };
            e.onerror = function() {
                Sg(e, !0, g);
                var a = new Tg(Vg, "Error while loading script " + d);
                eg(f);
                fg(f, !1, a)
            };
            a = b.attributes || {};
            bb(a, {
                type: "text/javascript",
                charset: "UTF-8",
                src: d
            });
            yc(e, a);
            Wg(c).appendChild(e);
            return f
        }

        function Wg(a) {
            var b = (a || document).getElementsByTagName(String(Gb));
            return b && 0 != b.length ? b[0] : a.documentElement
        }

        function Rg() {
            if (this && this.kd) {
                var a = this.kd;
                a && a.tagName == Ub && Sg(a, !0, this.rd)
            }
        }

        function Sg(a,
            b, c) {
            null != c && l.clearTimeout(c);
            a.onload = aa;
            a.onerror = aa;
            a.onreadystatechange = aa;
            b && window.setTimeout(function() {
                Dc(a)
            }, 0)
        }
        var Vg = 0,
            Ug = 1;

        function Tg(a, b) {
            var c = "Jsloader error (code #" + a + ")";
            b && (c += ": " + b);
            pa.call(this, c);
            this.code = a
        }
        t(Tg, pa);

        function Xg(a) {
            this.Mb = a
        }
        Xg.prototype.set = function(a, b) {
            m(b) ? this.Mb.set(a, mf(b)) : this.Mb.remove(a)
        };
        Xg.prototype.get = function(a) {
            var b;
            try {
                b = this.Mb.get(a)
            } catch (c) {
                return
            }
            if (null !== b) try {
                return lf(b)
            } catch (c$3) {
                throw "Storage: Invalid value was encountered";
            }
        };
        Xg.prototype.remove = function(a) {
            this.Mb.remove(a)
        };

        function Yg() {}

        function Zg() {}
        t(Zg, Yg);
        Zg.prototype.clear = function() {
            var a = Oc(this.va(!0)),
                b = this;
            Ga(a, function(a) {
                b.remove(a)
            })
        };

        function $g(a) {
            this.T = a
        }
        t($g, Zg);

        function ah(a) {
            if (!a.T) return !1;
            try {
                return a.T.setItem("__sak", "1"), a.T.removeItem("__sak"), !0
            } catch (b) {
                return !1
            }
        }
        h = $g.prototype;
        h.set = function(a, b) {
            try {
                this.T.setItem(a, b)
            } catch (c) {
                if (0 == this.T.length) throw "Storage mechanism: Storage disabled";
                throw "Storage mechanism: Quota exceeded";
            }
        };
        h.get = function(a) {
            a = this.T.getItem(a);
            if (!n(a) && null !== a) throw "Storage mechanism: Invalid value was encountered";
            return a
        };
        h.remove = function(a) {
            this.T.removeItem(a)
        };
        h.va = function(a) {
            var b = 0,
                c = this.T,
                d = new Lc;
            d.next = function() {
                if (b >= c.length) throw Kc;
                var d = c.key(b++);
                if (a) return d;
                d = c.getItem(d);
                if (!n(d)) throw "Storage mechanism: Invalid value was encountered";
                return d
            };
            return d
        };
        h.clear = function() {
            this.T.clear()
        };
        h.key = function(a) {
            return this.T.key(a)
        };

        function bh() {
            var a = null;
            try {
                a = window.localStorage ||
                    null
            } catch (b) {}
            this.T = a
        }
        t(bh, $g);

        function ch() {
            var a = null;
            try {
                a = window.sessionStorage || null
            } catch (b) {}
            this.T = a
        }
        t(ch, $g);

        function dh(a, b) {
            this.kb = a;
            this.ta = b + "::"
        }
        t(dh, Zg);
        dh.prototype.set = function(a, b) {
            this.kb.set(this.ta + a, b)
        };
        dh.prototype.get = function(a) {
            return this.kb.get(this.ta + a)
        };
        dh.prototype.remove = function(a) {
            this.kb.remove(this.ta + a)
        };
        dh.prototype.va = function(a) {
            var b = this.kb.va(!0),
                c = this,
                d = new Lc;
            d.next = function() {
                for (var d = b.next(); d.substr(0, c.ta.length) != c.ta;) d = b.next();
                return a ? d.substr(c.ta.length) :
                    c.kb.get(d)
            };
            return d
        };

        function eh(a) {
            this.M = void 0;
            this.G = {};
            if (a) {
                var b = Ic(a);
                a = Hc(a);
                for (var c = 0; c < b.length; c++) this.set(b[c], a[c])
            }
        }
        h = eh.prototype;
        h.set = function(a, b) {
            fh(this, a, b, !1)
        };
        h.add = function(a, b) {
            fh(this, a, b, !0)
        };

        function fh(a, b, c, d) {
            for (var e = 0; e < b.length; e++) {
                var f = b.charAt(e);
                a.G[f] || (a.G[f] = new eh);
                a = a.G[f]
            }
            if (d && void 0 !== a.M) throw Error('The collection already contains the key "' + b + '"');
            a.M = c
        }
        h.get = function(a) {
            a: {
                for (var b = this, c = 0; c < a.length; c++)
                    if (b = b.G[a.charAt(c)], !b) {
                        a = void 0;
                        break a
                    }
                a = b
            }
            return a ? a.M : void 0
        };
        h.R = function() {
            var a = [];
            gh(this, a);
            return a
        };

        function gh(a, b) {
            void 0 !== a.M && b.push(a.M);
            for (var c in a.G) gh(a.G[c], b)
        }
        h.ga = function(a) {
            var b = [];
            if (a) {
                for (var c = this, d = 0; d < a.length; d++) {
                    var e = a.charAt(d);
                    if (!c.G[e]) return [];
                    c = c.G[e]
                }
                hh(c, a, b)
            } else hh(this, "", b);
            return b
        };

        function hh(a, b, c) {
            void 0 !== a.M && c.push(b);
            for (var d in a.G) hh(a.G[d], b + d, c)
        }
        h.Ma = function(a) {
            return void 0 !== this.get(a)
        };
        h.clear = function() {
            this.G = {};
            this.M = void 0
        };
        h.remove = function(a) {
            for (var b =
                    this, c = [], d = 0; d < a.length; d++) {
                var e = a.charAt(d);
                if (!b.G[e]) throw Error('The collection does not have the key "' + a + '"');
                c.push([b, e]);
                b = b.G[e]
            }
            a = b.M;
            for (delete b.M; 0 < c.length;)
                if (e = c.pop(), b = e[0], e = e[1], b.G[e].Jb()) delete b.G[e];
                else break;
            return a
        };
        h.clone = function() {
            return new eh(this)
        };
        h.Jb = function() {
            var a;
            if (a = void 0 === this.M) a: {
                a = this.G;
                for (var b in a) {
                    a = !1;
                    break a
                }
                a = !0
            }
            return a
        };

        function ih(a) {
            a = a || {};
            var b = a.email,
                c = a.disabled,
                d = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="email">',
                d = a.Qe ? d + "Enter new email address" : d + "Email",
                d = d + ('</label><input type="email" name="email" autocomplete="username" class="mdl-textfield__input firebaseui-input firebaseui-id-email" value="' + Hd(null != b ? b : "") + '"' + (c ? "disabled" : "") + '></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-email-error"></p></div>');
            return C(d)
        }

        function H(a) {
            a = a || {};
            a = a.label;
            var b = '<button type="submit" class="firebaseui-id-submit firebaseui-button mdl-button mdl-js-button mdl-button--raised mdl-button--colored">',
                b = a ? b + B(a) : b + "Next";
            return C(b + "</button>")
        }

        function jh() {
            var a;
            a = "" + H({
                label: Fd("Sign In")
            });
            return C(a)
        }

        function kh() {
            var a;
            a = "" + H({
                label: Fd("Save")
            });
            return C(a)
        }

        function lh() {
            var a;
            a = "" + H({
                label: Fd("Continue")
            });
            return C(a)
        }

        function mh(a) {
            a = a || {};
            a = a.label;
            var b = '<div class="firebaseui-new-password-component"><div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="newPassword">',
                b = a ? b + B(a) : b + "Choose password";
            return C(b + '</label><input type="password" name="newPassword" autocomplete="new-password" class="mdl-textfield__input firebaseui-input firebaseui-id-new-password"></div><a href="javascript:void(0)" class="firebaseui-input-floating-button firebaseui-id-password-toggle firebaseui-input-toggle-on firebaseui-input-toggle-blur"></a><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-new-password-error"></p></div></div>')
        }

        function nh() {
            var a;
            a = {};
            var b = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="password">',
                b = a.current ? b + "Current password" : b + "Password";
            return C(b + '</label><input type="password" name="password" autocomplete="current-password" class="mdl-textfield__input firebaseui-input firebaseui-id-password"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-password-error"></p></div>')
        }

        function oh() {
            return C('<a class="firebaseui-link firebaseui-id-secondary-link" href="javascript:void(0)">Trouble signing in?</a>')
        }

        function ph() {
            return C('<button class="firebaseui-id-secondary-link firebaseui-button mdl-button mdl-js-button mdl-button--primary">Cancel</button>')
        }

        function qh(a) {
            a = "" + ('<div class="firebaseui-info-bar firebaseui-id-info-bar"><p class="firebaseui-info-bar-message">' + B(a.message) + '&nbsp;&nbsp;<a href="javascript:void(0)" class="firebaseui-link firebaseui-id-dismiss-info-bar">Dismiss</a></p></div>');
            return C(a)
        }
        qh.B = "firebaseui.auth.soy2.element.infoBar";

        function rh(a) {
            var b = a.content;
            a = a.Ed;
            return C('<dialog class="mdl-dialog firebaseui-dialog firebaseui-id-dialog' + (a ? " " + Hd(a) : "") + '">' + B(b) + "</dialog>")
        }

        function sh(a) {
            var b = a.message;
            return C(rh({
                content: Gd('<div class="firebaseui-dialog-icon-wrapper"><div class="' + Hd(a.Gb) + ' firebaseui-dialog-icon"></div></div><div class="firebaseui-progress-dialog-message">' + B(b) + "</div>")
            }))
        }
        sh.B = "firebaseui.auth.soy2.element.progressDialog";

        function th(a) {
            var b =
                '<div class="firebaseui-list-box-actions">';
            a = a.items;
            for (var c = a.length, d = 0; d < c; d++) var e = a[d],
                b = b + ('<button type="button" data-listboxid="' + Hd(e.id) + '" class="mdl-button firebaseui-id-list-box-dialog-button firebaseui-list-box-dialog-button">' + (e.Gb ? '<div class="firebaseui-list-box-icon-wrapper"><div class="firebaseui-list-box-icon ' + Hd(e.Gb) + '"></div></div>' : "") + '<div class="firebaseui-list-box-label-wrapper">' + B(e.label) + "</div></button>");
            b = "" + rh({
                Ed: Fd("firebaseui-list-box-dialog"),
                content: Gd(b +
                    "</div>")
            });
            return C(b)
        }
        th.B = "firebaseui.auth.soy2.element.listBoxDialog";

        function uh() {
            return C('<div class="mdl-progress mdl-js-progress mdl-progress__indeterminate firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>')
        }
        uh.B = "firebaseui.auth.soy2.element.busyIndicator";

        function vh(a) {
            a = a || {};
            var b = "";
            switch (a.providerId) {
                case "google.com":
                    b += "Google";
                    break;
                case "github.com":
                    b += "Github";
                    break;
                case "facebook.com":
                    b += "Facebook";
                    break;
                case "twitter.com":
                    b += "Twitter";
                    break;
                default:
                    b += "Password"
            }
            return D(b)
        }

        function wh(a) {
            a = a || {};
            var b = a.Hd;
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-sign-in"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in with email</h1></div><div class="firebaseui-card-content"><div class="firebaseui-relative-wrapper">' + ih(a) + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? ph() : "") + H(null) + "</div></div></form></div>");
            return C(a)
        }
        wh.B = "firebaseui.auth.soy2.page.signIn";

        function xh(a) {
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-sign-in"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content">' + ih(a) + nh() + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' + oh() + '</div><div class="firebaseui-form-actions">' + jh() + "</div></div></form></div>");
            return C(a)
        }
        xh.B = "firebaseui.auth.soy2.page.passwordSignIn";

        function yh(a) {
            a = a || {};
            var b = a.qe,
                c = a.rb,
                d = a.ac,
                e = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-sign-up"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Create account</h1></div><div class="firebaseui-card-content">' + ih(a);
            b ? (b = a || {}, b = b.name, b = "" + ('<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="name">First &amp; last name</label><input type="text" name="name" autocomplete="name" class="mdl-textfield__input firebaseui-input firebaseui-id-name" value="' +
                Hd(null != b ? b : "") + '"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-name-error"></p></div>'), b = C(b)) : b = "";
            e = e + b + mh({
                Re: !0
            });
            c ? (a = a || {}, a = "By tapping SAVE, you are indicating that you agree to the " + ('<a href="' + Hd(Md(a.rb)) + '" class="firebaseui-link" target="_blank">Terms of Service</a>'), a = C("" + ('<p class="firebaseui-tos">' + a + "</p>"))) : a = "";
            d = "" + (e + a + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
                (d ? ph() : "") + kh() + "</div></div></form></div>");
            return C(d)
        }
        yh.B = "firebaseui.auth.soy2.page.passwordSignUp";

        function zh(a) {
            a = a || {};
            var b = a.ac;
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Recover password</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Get instructions sent to this email that explain how to reset your password</p>' +
                ih(a) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? ph() : "") + H({
                    label: Fd("Send")
                }) + "</div></div></form></div>");
            return C(a)
        }
        zh.B = "firebaseui.auth.soy2.page.passwordRecovery";

        function Ah(a) {
            var b = a.N,
                c = "";
            a = "Follow the instructions sent to <strong>" + (B(a.email) + "</strong> to recover your password");
            c += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery-email-sent"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Check your email</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
                a + '</p></div><div class="firebaseui-card-actions">';
            b && (c += '<div class="firebaseui-form-actions">' + H({
                label: Fd("Done")
            }) + "</div>");
            return C(c + "</div></div>")
        }
        Ah.B = "firebaseui.auth.soy2.page.passwordRecoveryEmailSent";

        function Bh() {
            return C('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-callback"><div class="firebaseui-callback-indicator-container">' + uh() + "</div></div>")
        }
        Bh.B = "firebaseui.auth.soy2.page.callback";

        function Ch(a) {
            var b = "";
            a = "You\u2019ve already used <strong>" +
                (B(a.email) + "</strong> to sign in. Enter your password for that account.");
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text">' + a + "</p>" + nh() + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' +
                oh() + '</div><div class="firebaseui-form-actions">' + jh() + "</div></div></form></div>";
            return C(b)
        }
        Ch.B = "firebaseui.auth.soy2.page.passwordLinking";

        function Dh(a) {
            var b = a.email,
                c = "";
            a = "" + vh(a);
            a = Fd(a);
            b = "You\u2019ve already used <strong>" + (B(b) + ("</strong>. Sign in with " + (B(a) + " to continue.")));
            c += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-federated-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text">' +
                b + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + H({
                    label: Fd("Sign in with " + a)
                }) + "</div></div></form></div>";
            return C(c)
        }
        Dh.B = "firebaseui.auth.soy2.page.federatedLinking";

        function Eh(a) {
            var b = "",
                c = '<p class="firebaseui-text">for <strong>' + (B(a.email) + "</strong></p>"),
                b = b + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Reset your password</h1></div><div class="firebaseui-card-content">' +
                    c + mh(Ed(a)) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + kh() + "</div></div></form></div>");
            return C(b)
        }
        Eh.B = "firebaseui.auth.soy2.page.passwordReset";

        function Fh(a) {
            a = a || {};
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Password changed</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new password</p></div><div class="firebaseui-card-actions">' +
                (a.N ? '<div class="firebaseui-form-actions">' + lh() + "</div>" : "") + "</div></div>");
            return C(a)
        }
        Fh.B = "firebaseui.auth.soy2.page.passwordResetSuccess";

        function Gh(a) {
            a = a || {};
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try resetting your password again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to reset your password has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' +
                (a.N ? '<div class="firebaseui-form-actions">' + H(null) + "</div>" : "") + "</div></div>");
            return C(a)
        }
        Gh.B = "firebaseui.auth.soy2.page.passwordResetFailure";

        function Hh(a) {
            var b = a.N,
                c = "";
            a = "Your sign-in email address has been changed back to <strong>" + (B(a.email) + "</strong>.");
            c += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-success"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Updated email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
                a + '</p><p class="firebaseui-text">If you didn\u2019t ask to change your sign-in email, it\u2019s possible someone is trying to access your account and you should <a class="firebaseui-link firebaseui-id-reset-password-link" href="javascript:void(0)">change your password right away</a>.</p></div><div class="firebaseui-card-actions">' + (b ? '<div class="firebaseui-form-actions">' + H(null) + "</div>" : "") + "</div></form></div>";
            return C(c)
        }
        Hh.B = "firebaseui.auth.soy2.page.emailChangeRevokeSuccess";

        function Ih(a) {
            a =
                a || {};
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Unable to update your email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">There was a problem changing your sign-in email back.</p><p class="firebaseui-text">If you try again and still can\u2019t reset your email, try asking your administrator for help.</p></div><div class="firebaseui-card-actions">' +
                (a.N ? '<div class="firebaseui-form-actions">' + H(null) + "</div>" : "") + "</div></div>");
            return C(a)
        }
        Ih.B = "firebaseui.auth.soy2.page.emailChangeRevokeFailure";

        function Jh(a) {
            a = a || {};
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Your email has been verified</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new account</p></div><div class="firebaseui-card-actions">' +
                (a.N ? '<div class="firebaseui-form-actions">' + lh() + "</div>" : "") + "</div></div>");
            return C(a)
        }
        Jh.B = "firebaseui.auth.soy2.page.emailVerificationSuccess";

        function Kh(a) {
            a = a || {};
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try verifying your email again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to verify your email has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' +
                (a.N ? '<div class="firebaseui-form-actions">' + H(null) + "</div>" : "") + "</div></div>");
            return C(a)
        }
        Kh.B = "firebaseui.auth.soy2.page.emailVerificationFailure";

        function Lh(a) {
            a = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-unrecoverable-error"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Error encountered</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' + B(a.Ld) + "</p></div></div>");
            return C(a)
        }
        Lh.B = "firebaseui.auth.soy2.page.unrecoverableError";

        function Mh(a) {
            var b = a.le,
                c = "";
            a = "Continue with " + (B(a.Fe) + "?");
            b = "You originally wanted to sign in with " + B(b);
            c += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-mismatch"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">' + a + '</h2><p class="firebaseui-text">' + b + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
                ph() + H({
                    label: Fd("Continue")
                }) + "</div></div></form></div>";
            return C(c)
        }
        Mh.B = "firebaseui.auth.soy2.page.emailMismatch";

        function Nh(a, b, c) {
            var d = '<div class="firebaseui-container firebaseui-page-provider-sign-in firebaseui-id-page-provider-sign-in"><div class="firebaseui-card-content"><form onsubmit="return false;"><ul class="firebaseui-idp-list">';
            a = a.oe;
            b = a.length;
            for (var e = 0; e < b; e++) {
                var f;
                f = {
                    providerId: a[e]
                };
                var g = c,
                    k = f.providerId,
                    r = f,
                    r = r || {},
                    N = "";
                switch (r.providerId) {
                    case "google.com":
                        N += "firebaseui-idp-google";
                        break;
                    case "github.com":
                        N += "firebaseui-idp-github";
                        break;
                    case "facebook.com":
                        N += "firebaseui-idp-facebook";
                        break;
                    case "twitter.com":
                        N += "firebaseui-idp-twitter";
                        break;
                    case "phone":
                        N += "firebaseui-idp-phone";
                        break;
                    default:
                        N += "firebaseui-idp-password"
                }
                var r = '<button class="firebaseui-idp-button mdl-button mdl-js-button mdl-button--raised ' + Hd(D(N)) + ' firebaseui-id-idp-button" data-provider-id="' + Hd(k) + '"><span class="firebaseui-idp-icon-wrapper"><img class="firebaseui-idp-icon" alt="" src="',
                    N = (N = f) || {},
                    Fa = "";
                switch (N.providerId) {
                    case "google.com":
                        Fa += Md(g.Xd);
                        break;
                    case "github.com":
                        Fa += Md(g.Wd);
                        break;
                    case "facebook.com":
                        Fa += Md(g.Od);
                        break;
                    case "twitter.com":
                        Fa += Md(g.Ce);
                        break;
                    case "phone":
                        Fa += Md(g.me);
                        break;
                    default:
                        Fa += Md(g.ke)
                }
                g = Dd(Fa);
                r = r + Hd(Md(g)) + '"></span>';
                "password" == k ? r += '<span class="firebaseui-idp-text firebaseui-idp-text-long">Sign in with email</span><span class="firebaseui-idp-text firebaseui-idp-text-short">Email</span>' : "phone" == k ? r += '<span class="firebaseui-idp-text firebaseui-idp-text-long">Sign in with phone</span><span class="firebaseui-idp-text firebaseui-idp-text-short">Phone</span>' :
                    (k = "Sign in with " + B(vh(f)), r += '<span class="firebaseui-idp-text firebaseui-idp-text-long">' + k + '</span><span class="firebaseui-idp-text firebaseui-idp-text-short">' + B(vh(f)) + "</span>");
                f = C(r + "</button>");
                d += '<li class="firebaseui-list-item">' + f + "</li>"
            }
            return C(d + "</ul></form></div></div>")
        }
        Nh.B = "firebaseui.auth.soy2.page.providerSignIn";

        function Oh(a) {
            a = a || {};
            var b = a.Jd;
            a = a || {};
            a = a.lb;
            a = "" + ('<div class="firebaseui-phone-number"><button class="firebaseui-id-country-selector firebaseui-country-selector mdl-button mdl-js-button"><span class="firebaseui-flag firebaseui-country-selector-flag firebaseui-id-country-selector-flag"></span><span class="firebaseui-id-country-selector-code"></span></button><div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label firebaseui-textfield firebaseui-phone-input-wrapper"><label class="mdl-textfield__label firebaseui-label" for="phoneNumber">Phone number</label><input type="tel" name="phoneNumber" class="mdl-textfield__input firebaseui-input firebaseui-id-phone-number" value="' +
                Hd(null != a ? a : "") + '"></div></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-phone-number-error firebaseui-id-phone-number-error"></p></div>');
            b = "" + ('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-phone-sign-in-start"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Enter your phone number</h1></div><div class="firebaseui-card-content"><div class="firebaseui-relative-wrapper">' +
                C(a) + (b ? C('<div class="firebaseui-recaptcha-wrapper"><div class="firebaseui-recaptcha-container"></div><div class="firebaseui-error-wrapper firebaseui-recaptcha-error-wrapper"><p class="firebaseui-error firebaseui-hidden firebaseui-id-recaptcha-error"></p></div></div>') : "") + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + ph() + H({
                    label: Fd("Verify")
                }) + '</div></div><div class="firebaseui-card-footer">' + C('<p class="firebaseui-tos">By tapping Verify, an SMS may be sent. Message &amp; data rates may apply.</p>') +
                "</div></form></div>");
            return C(b)
        }
        Oh.B = "firebaseui.auth.soy2.page.phoneSignInStart";

        function Ph(a) {
            a = a || {};
            var b = a.phoneNumber,
                c = a.rb,
                d = "",
                e = 'Enter the 6-digit code we sent to <a class="firebaseui-link firebaseui-change-phone-number-link firebaseui-id-change-phone-number-link" href="javascript:void(0)">&lrm;' + (B(b) + "</a>");
            B(b);
            b = d;
            e = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-phone-sign-in-finish"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Verify your phone number</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
                e + "</p>" + C('<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="phoneConfirmationCode">6-digit code</label><input type="number" name="phoneConfirmationCode" class="mdl-textfield__input firebaseui-input firebaseui-id-phone-confirmation-code"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-phone-confirmation-code-error"></p></div>') +
                '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + ph() + H({
                    label: Fd("Continue")
                }) + "</div></div>";
            c ? (a = a || {}, a = "By tapping Continue you are indicating that you agree to the " + ('<a href="' + Hd(Md(a.rb)) + '" class="firebaseui-link" target="_blank">Terms of Service</a>'), a = '<div class="firebaseui-card-footer">' + C("" + ('<p class="firebaseui-tos">' + a + "</p>")) + "</div>") : a = "";
            d = b + (e + a + "</form>" + C('<div class="firebaseui-resend-container"><span class="firebaseui-id-resend-countdown"></span><a href="javascript:void(0)" class="firebaseui-id-resend-link firebaseui-hidden firebaseui-link">Resend</a></div>') +
                "</div>");
            return C(d)
        }
        Ph.B = "firebaseui.auth.soy2.page.phoneSignInFinish";

        function Qh() {
            return D("Enter a valid phone number")
        }

        function Rh() {
            return D("This email already exists without any means of sign-in. Please reset the password to recover.")
        }

        function Sh() {
            return D("Please login again to perform this operation")
        }

        function Th(a) {
            this.ab = a;
            this.Fc = new eh;
            for (a = 0; a < this.ab.length; a++) {
                var b = this.Fc.get("+" + this.ab[a].a);
                b ? b.push(this.ab[a]) : this.Fc.add("+" + this.ab[a].a, [this.ab[a]])
            }
        }
        Th.prototype.search =
            function(a) {
                var b = this.Fc,
                    c = {},
                    d = 0;
                void 0 !== b.M && (c[d] = b.M);
                for (; d < a.length; d++) {
                    var e = a.charAt(d);
                    if (!(e in b.G)) break;
                    b = b.G[e];
                    void 0 !== b.M && (c[d] = b.M)
                }
                for (var f in c)
                    if (c.hasOwnProperty(f)) return c[f];
                return []
            };

        function Uh(a) {
            for (var b = 0; b < Vh.length; b++)
                if (Vh[b].b === a) return Vh[b];
            return null
        }
        var Vh = [{
                name: "Afghanistan",
                b: "93-AF-0",
                a: "93",
                c: "AF"
            }, {
                name: "\u00c5land Islands",
                b: "358-AX-0",
                a: "358",
                c: "AX"
            }, {
                name: "Albania",
                b: "355-AL-0",
                a: "355",
                c: "AL"
            }, {
                name: "Algeria",
                b: "213-DZ-0",
                a: "213",
                c: "DZ"
            }, {
                name: "American Samoa",
                b: "1-AS-0",
                a: "1",
                c: "AS"
            }, {
                name: "Andorra",
                b: "376-AD-0",
                a: "376",
                c: "AD"
            }, {
                name: "Angola",
                b: "244-AO-0",
                a: "244",
                c: "AO"
            }, {
                name: "Anguilla",
                b: "1-AI-0",
                a: "1",
                c: "AI"
            }, {
                name: "Antigua and Barbuda",
                b: "1-AG-0",
                a: "1",
                c: "AG"
            }, {
                name: "Argentina",
                b: "54-AR-0",
                a: "54",
                c: "AR"
            }, {
                name: "Armenia",
                b: "374-AM-0",
                a: "374",
                c: "AM"
            }, {
                name: "Aruba",
                b: "297-AW-0",
                a: "297",
                c: "AW"
            }, {
                name: "Ascension Island",
                b: "247-AC-0",
                a: "247",
                c: "AC"
            }, {
                name: "Australia",
                b: "61-AU-0",
                a: "61",
                c: "AU"
            }, {
                name: "Austria",
                b: "43-AT-0",
                a: "43",
                c: "AT"
            }, {
                name: "Azerbaijan",
                b: "994-AZ-0",
                a: "994",
                c: "AZ"
            }, {
                name: "Bahamas",
                b: "1-BS-0",
                a: "1",
                c: "BS"
            }, {
                name: "Bahrain",
                b: "973-BH-0",
                a: "973",
                c: "BH"
            }, {
                name: "Bangladesh",
                b: "880-BD-0",
                a: "880",
                c: "BD"
            }, {
                name: "Barbados",
                b: "1-BB-0",
                a: "1",
                c: "BB"
            }, {
                name: "Belarus",
                b: "375-BY-0",
                a: "375",
                c: "BY"
            }, {
                name: "Belgium",
                b: "32-BE-0",
                a: "32",
                c: "BE"
            }, {
                name: "Belize",
                b: "501-BZ-0",
                a: "501",
                c: "BZ"
            }, {
                name: "Benin",
                b: "229-BJ-0",
                a: "229",
                c: "BJ"
            }, {
                name: "Bermuda",
                b: "1-BM-0",
                a: "1",
                c: "BM"
            }, {
                name: "Bhutan",
                b: "975-BT-0",
                a: "975",
                c: "BT"
            }, {
                name: "Bolivia",
                b: "591-BO-0",
                a: "591",
                c: "BO"
            }, {
                name: "Bosnia and Herzegovina",
                b: "387-BA-0",
                a: "387",
                c: "BA"
            }, {
                name: "Botswana",
                b: "267-BW-0",
                a: "267",
                c: "BW"
            }, {
                name: "Brazil",
                b: "55-BR-0",
                a: "55",
                c: "BR"
            }, {
                name: "British Indian Ocean Territory",
                b: "246-IO-0",
                a: "246",
                c: "IO"
            }, {
                name: "British Virgin Islands",
                b: "1-VG-0",
                a: "1",
                c: "VG"
            }, {
                name: "Brunei",
                b: "673-BN-0",
                a: "673",
                c: "BN"
            }, {
                name: "Bulgaria",
                b: "359-BG-0",
                a: "359",
                c: "BG"
            }, {
                name: "Burkina Faso",
                b: "226-BF-0",
                a: "226",
                c: "BF"
            }, {
                name: "Burundi",
                b: "257-BI-0",
                a: "257",
                c: "BI"
            }, {
                name: "Cambodia",
                b: "855-KH-0",
                a: "855",
                c: "KH"
            }, {
                name: "Cameroon",
                b: "237-CM-0",
                a: "237",
                c: "CM"
            }, {
                name: "Canada",
                b: "1-CA-0",
                a: "1",
                c: "CA"
            }, {
                name: "Cape Verde",
                b: "238-CV-0",
                a: "238",
                c: "CV"
            }, {
                name: "Caribbean Netherlands",
                b: "599-BQ-0",
                a: "599",
                c: "BQ"
            }, {
                name: "Cayman Islands",
                b: "1-KY-0",
                a: "1",
                c: "KY"
            }, {
                name: "Central African Republic",
                b: "236-CF-0",
                a: "236",
                c: "CF"
            }, {
                name: "Chad",
                b: "235-TD-0",
                a: "235",
                c: "TD"
            }, {
                name: "Chile",
                b: "56-CL-0",
                a: "56",
                c: "CL"
            }, {
                name: "China",
                b: "86-CN-0",
                a: "86",
                c: "CN"
            }, {
                name: "Christmas Island",
                b: "61-CX-0",
                a: "61",
                c: "CX"
            }, {
                name: "Cocos [Keeling] Islands",
                b: "61-CC-0",
                a: "61",
                c: "CC"
            }, {
                name: "Colombia",
                b: "57-CO-0",
                a: "57",
                c: "CO"
            }, {
                name: "Comoros",
                b: "269-KM-0",
                a: "269",
                c: "KM"
            }, {
                name: "Democratic Republic Congo",
                b: "243-CD-0",
                a: "243",
                c: "CD"
            }, {
                name: "Republic of Congo",
                b: "242-CG-0",
                a: "242",
                c: "CG"
            }, {
                name: "Cook Islands",
                b: "682-CK-0",
                a: "682",
                c: "CK"
            }, {
                name: "Costa Rica",
                b: "506-CR-0",
                a: "506",
                c: "CR"
            }, {
                name: "C\u00f4te d'Ivoire",
                b: "225-CI-0",
                a: "225",
                c: "CI"
            }, {
                name: "Croatia",
                b: "385-HR-0",
                a: "385",
                c: "HR"
            }, {
                name: "Cuba",
                b: "53-CU-0",
                a: "53",
                c: "CU"
            }, {
                name: "Cura\u00e7ao",
                b: "599-CW-0",
                a: "599",
                c: "CW"
            }, {
                name: "Cyprus",
                b: "357-CY-0",
                a: "357",
                c: "CY"
            }, {
                name: "Czech Republic",
                b: "420-CZ-0",
                a: "420",
                c: "CZ"
            }, {
                name: "Denmark",
                b: "45-DK-0",
                a: "45",
                c: "DK"
            }, {
                name: "Djibouti",
                b: "253-DJ-0",
                a: "253",
                c: "DJ"
            }, {
                name: "Dominica",
                b: "1-DM-0",
                a: "1",
                c: "DM"
            }, {
                name: "Dominican Republic",
                b: "1-DO-0",
                a: "1",
                c: "DO"
            }, {
                name: "East Timor",
                b: "670-TL-0",
                a: "670",
                c: "TL"
            }, {
                name: "Ecuador",
                b: "593-EC-0",
                a: "593",
                c: "EC"
            }, {
                name: "Egypt",
                b: "20-EG-0",
                a: "20",
                c: "EG"
            }, {
                name: "El Salvador",
                b: "503-SV-0",
                a: "503",
                c: "SV"
            }, {
                name: "Equatorial Guinea",
                b: "240-GQ-0",
                a: "240",
                c: "GQ"
            }, {
                name: "Eritrea",
                b: "291-ER-0",
                a: "291",
                c: "ER"
            }, {
                name: "Estonia",
                b: "372-EE-0",
                a: "372",
                c: "EE"
            }, {
                name: "Ethiopia",
                b: "251-ET-0",
                a: "251",
                c: "ET"
            }, {
                name: "Falkland Islands [Islas Malvinas]",
                b: "500-FK-0",
                a: "500",
                c: "FK"
            }, {
                name: "Faroe Islands",
                b: "298-FO-0",
                a: "298",
                c: "FO"
            }, {
                name: "Fiji",
                b: "679-FJ-0",
                a: "679",
                c: "FJ"
            }, {
                name: "Finland",
                b: "358-FI-0",
                a: "358",
                c: "FI"
            }, {
                name: "France",
                b: "33-FR-0",
                a: "33",
                c: "FR"
            }, {
                name: "French Guiana",
                b: "594-GF-0",
                a: "594",
                c: "GF"
            }, {
                name: "French Polynesia",
                b: "689-PF-0",
                a: "689",
                c: "PF"
            }, {
                name: "Gabon",
                b: "241-GA-0",
                a: "241",
                c: "GA"
            }, {
                name: "Gambia",
                b: "220-GM-0",
                a: "220",
                c: "GM"
            }, {
                name: "Georgia",
                b: "995-GE-0",
                a: "995",
                c: "GE"
            }, {
                name: "Germany",
                b: "49-DE-0",
                a: "49",
                c: "DE"
            }, {
                name: "Ghana",
                b: "233-GH-0",
                a: "233",
                c: "GH"
            }, {
                name: "Gibraltar",
                b: "350-GI-0",
                a: "350",
                c: "GI"
            }, {
                name: "Greece",
                b: "30-GR-0",
                a: "30",
                c: "GR"
            }, {
                name: "Greenland",
                b: "299-GL-0",
                a: "299",
                c: "GL"
            }, {
                name: "Grenada",
                b: "1-GD-0",
                a: "1",
                c: "GD"
            }, {
                name: "Guadeloupe",
                b: "590-GP-0",
                a: "590",
                c: "GP"
            }, {
                name: "Guam",
                b: "1-GU-0",
                a: "1",
                c: "GU"
            }, {
                name: "Guatemala",
                b: "502-GT-0",
                a: "502",
                c: "GT"
            }, {
                name: "Guernsey",
                b: "44-GG-0",
                a: "44",
                c: "GG"
            }, {
                name: "Guinea Conakry",
                b: "224-GN-0",
                a: "224",
                c: "GN"
            }, {
                name: "Guinea-Bissau",
                b: "245-GW-0",
                a: "245",
                c: "GW"
            }, {
                name: "Guyana",
                b: "592-GY-0",
                a: "592",
                c: "GY"
            }, {
                name: "Haiti",
                b: "509-HT-0",
                a: "509",
                c: "HT"
            }, {
                name: "Heard Island and McDonald Islands",
                b: "672-HM-0",
                a: "672",
                c: "HM"
            }, {
                name: "Honduras",
                b: "504-HN-0",
                a: "504",
                c: "HN"
            }, {
                name: "Hong Kong",
                b: "852-HK-0",
                a: "852",
                c: "HK"
            }, {
                name: "Hungary",
                b: "36-HU-0",
                a: "36",
                c: "HU"
            }, {
                name: "Iceland",
                b: "354-IS-0",
                a: "354",
                c: "IS"
            }, {
                name: "India",
                b: "91-IN-0",
                a: "91",
                c: "IN"
            }, {
                name: "Indonesia",
                b: "62-ID-0",
                a: "62",
                c: "ID"
            }, {
                name: "Iran",
                b: "98-IR-0",
                a: "98",
                c: "IR"
            }, {
                name: "Iraq",
                b: "964-IQ-0",
                a: "964",
                c: "IQ"
            }, {
                name: "Ireland",
                b: "353-IE-0",
                a: "353",
                c: "IE"
            }, {
                name: "Isle of Man",
                b: "44-IM-0",
                a: "44",
                c: "IM"
            }, {
                name: "Israel",
                b: "972-IL-0",
                a: "972",
                c: "IL"
            }, {
                name: "Italy",
                b: "39-IT-0",
                a: "39",
                c: "IT"
            }, {
                name: "Jamaica",
                b: "1-JM-0",
                a: "1",
                c: "JM"
            }, {
                name: "Japan",
                b: "81-JP-0",
                a: "81",
                c: "JP"
            }, {
                name: "Jersey",
                b: "44-JE-0",
                a: "44",
                c: "JE"
            }, {
                name: "Jordan",
                b: "962-JO-0",
                a: "962",
                c: "JO"
            }, {
                name: "Kazakhstan",
                b: "7-KZ-0",
                a: "7",
                c: "KZ"
            }, {
                name: "Kenya",
                b: "254-KE-0",
                a: "254",
                c: "KE"
            }, {
                name: "Kiribati",
                b: "686-KI-0",
                a: "686",
                c: "KI"
            }, {
                name: "Kosovo",
                b: "377-XK-0",
                a: "377",
                c: "XK"
            }, {
                name: "Kosovo",
                b: "381-XK-0",
                a: "381",
                c: "XK"
            }, {
                name: "Kosovo",
                b: "386-XK-0",
                a: "386",
                c: "XK"
            }, {
                name: "Kuwait",
                b: "965-KW-0",
                a: "965",
                c: "KW"
            }, {
                name: "Kyrgyzstan",
                b: "996-KG-0",
                a: "996",
                c: "KG"
            }, {
                name: "Laos",
                b: "856-LA-0",
                a: "856",
                c: "LA"
            }, {
                name: "Latvia",
                b: "371-LV-0",
                a: "371",
                c: "LV"
            }, {
                name: "Lebanon",
                b: "961-LB-0",
                a: "961",
                c: "LB"
            },
            {
                name: "Lesotho",
                b: "266-LS-0",
                a: "266",
                c: "LS"
            }, {
                name: "Liberia",
                b: "231-LR-0",
                a: "231",
                c: "LR"
            }, {
                name: "Libya",
                b: "218-LY-0",
                a: "218",
                c: "LY"
            }, {
                name: "Liechtenstein",
                b: "423-LI-0",
                a: "423",
                c: "LI"
            }, {
                name: "Lithuania",
                b: "370-LT-0",
                a: "370",
                c: "LT"
            }, {
                name: "Luxembourg",
                b: "352-LU-0",
                a: "352",
                c: "LU"
            }, {
                name: "Macau",
                b: "853-MO-0",
                a: "853",
                c: "MO"
            }, {
                name: "Macedonia",
                b: "389-MK-0",
                a: "389",
                c: "MK"
            }, {
                name: "Madagascar",
                b: "261-MG-0",
                a: "261",
                c: "MG"
            }, {
                name: "Malawi",
                b: "265-MW-0",
                a: "265",
                c: "MW"
            }, {
                name: "Malaysia",
                b: "60-MY-0",
                a: "60",
                c: "MY"
            },
            {
                name: "Maldives",
                b: "960-MV-0",
                a: "960",
                c: "MV"
            }, {
                name: "Mali",
                b: "223-ML-0",
                a: "223",
                c: "ML"
            }, {
                name: "Malta",
                b: "356-MT-0",
                a: "356",
                c: "MT"
            }, {
                name: "Marshall Islands",
                b: "692-MH-0",
                a: "692",
                c: "MH"
            }, {
                name: "Martinique",
                b: "596-MQ-0",
                a: "596",
                c: "MQ"
            }, {
                name: "Mauritania",
                b: "222-MR-0",
                a: "222",
                c: "MR"
            }, {
                name: "Mauritius",
                b: "230-MU-0",
                a: "230",
                c: "MU"
            }, {
                name: "Mayotte",
                b: "262-YT-0",
                a: "262",
                c: "YT"
            }, {
                name: "Mexico",
                b: "52-MX-0",
                a: "52",
                c: "MX"
            }, {
                name: "Micronesia",
                b: "691-FM-0",
                a: "691",
                c: "FM"
            }, {
                name: "Moldova",
                b: "373-MD-0",
                a: "373",
                c: "MD"
            },
            {
                name: "Monaco",
                b: "377-MC-0",
                a: "377",
                c: "MC"
            }, {
                name: "Mongolia",
                b: "976-MN-0",
                a: "976",
                c: "MN"
            }, {
                name: "Montenegro",
                b: "382-ME-0",
                a: "382",
                c: "ME"
            }, {
                name: "Montserrat",
                b: "1-MS-0",
                a: "1",
                c: "MS"
            }, {
                name: "Morocco",
                b: "212-MA-0",
                a: "212",
                c: "MA"
            }, {
                name: "Mozambique",
                b: "258-MZ-0",
                a: "258",
                c: "MZ"
            }, {
                name: "Myanmar [Burma]",
                b: "95-MM-0",
                a: "95",
                c: "MM"
            }, {
                name: "Namibia",
                b: "264-NA-0",
                a: "264",
                c: "NA"
            }, {
                name: "Nauru",
                b: "674-NR-0",
                a: "674",
                c: "NR"
            }, {
                name: "Nepal",
                b: "977-NP-0",
                a: "977",
                c: "NP"
            }, {
                name: "Netherlands",
                b: "31-NL-0",
                a: "31",
                c: "NL"
            },
            {
                name: "New Caledonia",
                b: "687-NC-0",
                a: "687",
                c: "NC"
            }, {
                name: "New Zealand",
                b: "64-NZ-0",
                a: "64",
                c: "NZ"
            }, {
                name: "Nicaragua",
                b: "505-NI-0",
                a: "505",
                c: "NI"
            }, {
                name: "Niger",
                b: "227-NE-0",
                a: "227",
                c: "NE"
            }, {
                name: "Nigeria",
                b: "234-NG-0",
                a: "234",
                c: "NG"
            }, {
                name: "Niue",
                b: "683-NU-0",
                a: "683",
                c: "NU"
            }, {
                name: "Norfolk Island",
                b: "672-NF-0",
                a: "672",
                c: "NF"
            }, {
                name: "North Korea",
                b: "850-KP-0",
                a: "850",
                c: "KP"
            }, {
                name: "Northern Mariana Islands",
                b: "1-MP-0",
                a: "1",
                c: "MP"
            }, {
                name: "Norway",
                b: "47-NO-0",
                a: "47",
                c: "NO"
            }, {
                name: "Oman",
                b: "968-OM-0",
                a: "968",
                c: "OM"
            }, {
                name: "Pakistan",
                b: "92-PK-0",
                a: "92",
                c: "PK"
            }, {
                name: "Palau",
                b: "680-PW-0",
                a: "680",
                c: "PW"
            }, {
                name: "Palestinian Territories",
                b: "970-PS-0",
                a: "970",
                c: "PS"
            }, {
                name: "Panama",
                b: "507-PA-0",
                a: "507",
                c: "PA"
            }, {
                name: "Papua New Guinea",
                b: "675-PG-0",
                a: "675",
                c: "PG"
            }, {
                name: "Paraguay",
                b: "595-PY-0",
                a: "595",
                c: "PY"
            }, {
                name: "Peru",
                b: "51-PE-0",
                a: "51",
                c: "PE"
            }, {
                name: "Philippines",
                b: "63-PH-0",
                a: "63",
                c: "PH"
            }, {
                name: "Poland",
                b: "48-PL-0",
                a: "48",
                c: "PL"
            }, {
                name: "Portugal",
                b: "351-PT-0",
                a: "351",
                c: "PT"
            }, {
                name: "Puerto Rico",
                b: "1-PR-0",
                a: "1",
                c: "PR"
            }, {
                name: "Qatar",
                b: "974-QA-0",
                a: "974",
                c: "QA"
            }, {
                name: "R\u00e9union",
                b: "262-RE-0",
                a: "262",
                c: "RE"
            }, {
                name: "Romania",
                b: "40-RO-0",
                a: "40",
                c: "RO"
            }, {
                name: "Russia",
                b: "7-RU-0",
                a: "7",
                c: "RU"
            }, {
                name: "Rwanda",
                b: "250-RW-0",
                a: "250",
                c: "RW"
            }, {
                name: "Saint Barth\u00e9lemy",
                b: "590-BL-0",
                a: "590",
                c: "BL"
            }, {
                name: "Saint Helena",
                b: "290-SH-0",
                a: "290",
                c: "SH"
            }, {
                name: "St. Kitts",
                b: "1-KN-0",
                a: "1",
                c: "KN"
            }, {
                name: "St. Lucia",
                b: "1-LC-0",
                a: "1",
                c: "LC"
            }, {
                name: "Saint Martin",
                b: "590-MF-0",
                a: "590",
                c: "MF"
            }, {
                name: "Saint Pierre and Miquelon",
                b: "508-PM-0",
                a: "508",
                c: "PM"
            }, {
                name: "St. Vincent",
                b: "1-VC-0",
                a: "1",
                c: "VC"
            }, {
                name: "Samoa",
                b: "685-WS-0",
                a: "685",
                c: "WS"
            }, {
                name: "San Marino",
                b: "378-SM-0",
                a: "378",
                c: "SM"
            }, {
                name: "S\u00e3o Tom\u00e9 and Pr\u00edncipe",
                b: "239-ST-0",
                a: "239",
                c: "ST"
            }, {
                name: "Saudi Arabia",
                b: "966-SA-0",
                a: "966",
                c: "SA"
            }, {
                name: "Senegal",
                b: "221-SN-0",
                a: "221",
                c: "SN"
            }, {
                name: "Serbia",
                b: "381-RS-0",
                a: "381",
                c: "RS"
            }, {
                name: "Seychelles",
                b: "248-SC-0",
                a: "248",
                c: "SC"
            }, {
                name: "Sierra Leone",
                b: "232-SL-0",
                a: "232",
                c: "SL"
            }, {
                name: "Singapore",
                b: "65-SG-0",
                a: "65",
                c: "SG"
            }, {
                name: "Sint Maarten",
                b: "1-SX-0",
                a: "1",
                c: "SX"
            }, {
                name: "Slovakia",
                b: "421-SK-0",
                a: "421",
                c: "SK"
            }, {
                name: "Slovenia",
                b: "386-SI-0",
                a: "386",
                c: "SI"
            }, {
                name: "Solomon Islands",
                b: "677-SB-0",
                a: "677",
                c: "SB"
            }, {
                name: "Somalia",
                b: "252-SO-0",
                a: "252",
                c: "SO"
            }, {
                name: "South Africa",
                b: "27-ZA-0",
                a: "27",
                c: "ZA"
            }, {
                name: "South Georgia and the South Sandwich Islands",
                b: "500-GS-0",
                a: "500",
                c: "GS"
            }, {
                name: "South Korea",
                b: "82-KR-0",
                a: "82",
                c: "KR"
            }, {
                name: "South Sudan",
                b: "211-SS-0",
                a: "211",
                c: "SS"
            }, {
                name: "Spain",
                b: "34-ES-0",
                a: "34",
                c: "ES"
            }, {
                name: "Sri Lanka",
                b: "94-LK-0",
                a: "94",
                c: "LK"
            }, {
                name: "Sudan",
                b: "249-SD-0",
                a: "249",
                c: "SD"
            }, {
                name: "Suriname",
                b: "597-SR-0",
                a: "597",
                c: "SR"
            }, {
                name: "Svalbard and Jan Mayen",
                b: "47-SJ-0",
                a: "47",
                c: "SJ"
            }, {
                name: "Swaziland",
                b: "268-SZ-0",
                a: "268",
                c: "SZ"
            }, {
                name: "Sweden",
                b: "46-SE-0",
                a: "46",
                c: "SE"
            }, {
                name: "Switzerland",
                b: "41-CH-0",
                a: "41",
                c: "CH"
            }, {
                name: "Syria",
                b: "963-SY-0",
                a: "963",
                c: "SY"
            }, {
                name: "Taiwan",
                b: "886-TW-0",
                a: "886",
                c: "TW"
            }, {
                name: "Tajikistan",
                b: "992-TJ-0",
                a: "992",
                c: "TJ"
            }, {
                name: "Tanzania",
                b: "255-TZ-0",
                a: "255",
                c: "TZ"
            }, {
                name: "Thailand",
                b: "66-TH-0",
                a: "66",
                c: "TH"
            }, {
                name: "Togo",
                b: "228-TG-0",
                a: "228",
                c: "TG"
            }, {
                name: "Tokelau",
                b: "690-TK-0",
                a: "690",
                c: "TK"
            }, {
                name: "Tonga",
                b: "676-TO-0",
                a: "676",
                c: "TO"
            }, {
                name: "Trinidad/Tobago",
                b: "1-TT-0",
                a: "1",
                c: "TT"
            }, {
                name: "Tunisia",
                b: "216-TN-0",
                a: "216",
                c: "TN"
            }, {
                name: "Turkey",
                b: "90-TR-0",
                a: "90",
                c: "TR"
            }, {
                name: "Turkmenistan",
                b: "993-TM-0",
                a: "993",
                c: "TM"
            }, {
                name: "Turks and Caicos Islands",
                b: "1-TC-0",
                a: "1",
                c: "TC"
            }, {
                name: "Tuvalu",
                b: "688-TV-0",
                a: "688",
                c: "TV"
            }, {
                name: "U.S. Virgin Islands",
                b: "1-VI-0",
                a: "1",
                c: "VI"
            }, {
                name: "Uganda",
                b: "256-UG-0",
                a: "256",
                c: "UG"
            }, {
                name: "Ukraine",
                b: "380-UA-0",
                a: "380",
                c: "UA"
            }, {
                name: "United Arab Emirates",
                b: "971-AE-0",
                a: "971",
                c: "AE"
            }, {
                name: "United Kingdom",
                b: "44-GB-0",
                a: "44",
                c: "GB"
            }, {
                name: "United States",
                b: "1-US-0",
                a: "1",
                c: "US"
            }, {
                name: "Uruguay",
                b: "598-UY-0",
                a: "598",
                c: "UY"
            }, {
                name: "Uzbekistan",
                b: "998-UZ-0",
                a: "998",
                c: "UZ"
            }, {
                name: "Vanuatu",
                b: "678-VU-0",
                a: "678",
                c: "VU"
            }, {
                name: "Vatican City",
                b: "379-VA-0",
                a: "379",
                c: "VA"
            }, {
                name: "Venezuela",
                b: "58-VE-0",
                a: "58",
                c: "VE"
            },
            {
                name: "Vietnam",
                b: "84-VN-0",
                a: "84",
                c: "VN"
            }, {
                name: "Wallis and Futuna",
                b: "681-WF-0",
                a: "681",
                c: "WF"
            }, {
                name: "Western Sahara",
                b: "212-EH-0",
                a: "212",
                c: "EH"
            }, {
                name: "Yemen",
                b: "967-YE-0",
                a: "967",
                c: "YE"
            }, {
                name: "Zambia",
                b: "260-ZM-0",
                a: "260",
                c: "ZM"
            }, {
                name: "Zimbabwe",
                b: "263-ZW-0",
                a: "263",
                c: "ZW"
            }
        ];
        (function(a, b) {
            a.sort(function(a, d) {
                return a.name.localeCompare(d.name, b)
            })
        })(Vh, "en");
        var Wh = new Th(Vh);

        function Xh(a, b, c, d) {
            this.cb = a;
            this.Pc = b || null;
            this.ne = c || null;
            this.zc = d || null
        }
        Xh.prototype.J = function() {
            return this.cb
        };
        Xh.prototype.qb = function() {
            return {
                email: this.cb,
                displayName: this.Pc,
                photoUrl: this.ne,
                providerId: this.zc
            }
        };

        function Yh(a) {
            return a.email ? new Xh(a.email, a.displayName, a.photoUrl, a.providerId) : null
        }
        var Zh = null;

        function $h(a) {
            return !(!a || -32E3 != a.code || "Service unavailable" != a.message)
        }

        function ai(a, b, c, d) {
            Zh || (a = {
                    callbacks: {
                        empty: a,
                        select: function(a, d) {
                            a && a.account && b ? b(Yh(a.account)) : c && c(!$h(d))
                        },
                        store: a,
                        update: a
                    },
                    language: "en",
                    providers: void 0,
                    ui: d
                }, "undefined" != typeof accountchooser && accountchooser.Api &&
                accountchooser.Api.init ? Zh = accountchooser.Api.init(a) : (Zh = new bi(a), ci()))
        }

        function di(a, b, c) {
            function d() {
                var a = kd(c).toString();
                Zh.select(Ja(b || [], function(a) {
                    return a.qb()
                }), {
                    clientCallbackUrl: a
                })
            }
            b && b.length ? d() : Zh.checkEmpty(function(b, c) {
                b || c ? a(!$h(c)) : d()
            })
        }

        function bi(a) {
            this.g = a;
            this.g.callbacks = this.g.callbacks || {}
        }

        function ci() {
            var a = Zh;
            ga(a.g.callbacks.empty) && a.g.callbacks.empty()
        }
        var ei = {
            code: -32E3,
            message: "Service unavailable",
            data: "Service is unavailable."
        };
        h = bi.prototype;
        h.store =
            function() {
                ga(this.g.callbacks.store) && this.g.callbacks.store(void 0, ei)
            };
        h.select = function() {
            ga(this.g.callbacks.select) && this.g.callbacks.select(void 0, ei)
        };
        h.update = function() {
            ga(this.g.callbacks.update) && this.g.callbacks.update(void 0, ei)
        };
        h.checkDisabled = function(a) {
            a(!0)
        };
        h.checkEmpty = function(a) {
            a(void 0, ei)
        };
        h.checkAccountExist = function(a, b) {
            b(void 0, ei)
        };
        h.checkShouldUpdate = function(a, b) {
            b(void 0, ei)
        };

        function fi(a) {
            a = ha(a) && 1 == a.nodeType ? a : document.querySelector(String(a));
            if (null == a) throw Error("Could not find the FirebaseUI widget element on the page.");
            return a
        }

        function gi(a) {
            hi(a, "upgradeElement")
        }

        function ii(a) {
            hi(a, "downgradeElements")
        }
        var ji = ["mdl-js-textfield", "mdl-js-progress", "mdl-js-spinner", "mdl-js-button"];

        function hi(a, b) {
            a && window.componentHandler && window.componentHandler[b] && Ga(ji, function(c) {
                if (ug(a, c)) window.componentHandler[b](a);
                c = vc(c, a);
                Ga(c, function(a) {
                    window.componentHandler[b](a)
                })
            })
        }

        function ki() {
            this.ca = {}
        }
        ki.prototype.define = function(a, b) {
            if (a.toLowerCase() in this.ca) throw Error("Configuration " + a + " has already been defined.");
            this.ca[a.toLowerCase()] = b
        };
        ki.prototype.update = function(a, b) {
            if (!(a.toLowerCase() in this.ca)) throw Error("Configuration " + a + " is not defined.");
            this.ca[a.toLowerCase()] = b
        };
        ki.prototype.get = function(a) {
            if (!(a.toLowerCase() in this.ca)) throw Error("Configuration " + a + " is not defined.");
            return this.ca[a.toLowerCase()]
        };

        function li(a, b) {
            a = a.get(b);
            if (!a) throw Error("Configuration " + b + " is required.");
            return a
        }
        var mi = {},
            ni = 0;

        function oi(a, b) {
            if (!a) throw Error("Event target element must be provided!");
            a = pi(a);
            if (mi[a] && mi[a].length)
                for (var c = 0; c < mi[a].length; c++) mi[a][c].dispatchEvent(b)
        }

        function qi(a) {
            var b = pi(a.L());
            mi[b] && mi[b].length && (Pa(mi[b], function(b) {
                return b == a
            }), mi[b].length || delete mi[b])
        }

        function pi(a) {
            "undefined" === typeof a.Oc && (a.Oc = ni, ni++);
            return a.Oc
        }

        function ri(a) {
            if (!a) throw Error("Event target element must be provided!");
            this.Id = a;
            F.call(this)
        }
        t(ri, F);
        ri.prototype.L = function() {
            return this.Id
        };
        ri.prototype.register = function() {
            var a = pi(this.L());
            mi[a] ? Ma(mi[a], this) || mi[a].push(this) :
                mi[a] = [this]
        };
        ri.prototype.unregister = function() {
            qi(this)
        };
        var si = {
            "facebook.com": "FacebookAuthProvider",
            "github.com": "GithubAuthProvider",
            "google.com": "GoogleAuthProvider",
            password: "EmailAuthProvider",
            "twitter.com": "TwitterAuthProvider",
            phone: "PhoneAuthProvider"
        };
        var Df;
        Df = Hf("firebaseui");
        var ti = new Of;
        if (1 != ti.Vc) {
            Gf();
            var ui = Ff,
                vi = ti.pe;
            ui.ib || (ui.ib = []);
            ui.ib.push(vi);
            ti.Vc = !0
        }

        function wi(a, b) {
            this.cb = a;
            this.ya = b || null
        }
        wi.prototype.J = function() {
            return this.cb
        };
        wi.prototype.qb = function() {
            return {
                email: this.cb,
                credential: this.ya && $a(this.ya)
            }
        };

        function xi(a) {
            if (a && a.email) {
                var b;
                if (b = a.credential) {
                    var c = (b = a.credential) && b.providerId;
                    b = si[c] && firebase.auth[si[c]] ? b.secret && b.accessToken ? firebase.auth[si[c]].credential(b.accessToken, b.secret) : c == firebase.auth.GoogleAuthProvider.PROVIDER_ID ? firebase.auth[si[c]].credential(b.idToken, b.accessToken) : firebase.auth[si[c]].credential(b.accessToken) : null
                }
                return new wi(a.email, b)
            }
            return null
        }

        function yi(a, b) {
            this.wb = a;
            this.lb = b
        }

        function zi(a) {
            a = sa(a);
            var b = Wh.search(a);
            return 0 < b.length ? new yi("1" == b[0].a ? "1-US-0" : b[0].b, sa(a.substr(b[0].a.length + 1))) : null
        }

        function Ai(a) {
            var b = Uh(a.wb);
            if (!b) throw Error("Country ID " + a.wb + " not found.");
            return "+" + b.a + a.lb
        }
        var Bi = /MSIE ([\d.]+).*Windows NT ([\d.]+)/,
            Ci = /Firefox\/([\d.]+)/,
            Di = /Opera[ \/]([\d.]+)(.*Version\/([\d.]+))?/,
            Ei = /Chrome\/([\d.]+)/,
            Fi = /((Windows NT ([\d.]+))|(Mac OS X ([\d_]+))).*Version\/([\d.]+).*Safari/,
            Gi = /Mac OS X;.*(?!(Version)).*Safari/,
            Hi = /Android ([\d.]+).*Safari/,
            Ii = /OS ([\d_]+) like Mac OS X.*Mobile.*Safari/,
            Ji = /Konqueror\/([\d.]+)/,
            Ki = /MSIE ([\d.]+).*Windows Phone OS ([\d.]+)/;

        function I(a, b) {
            this.Xa = a;
            a = a.split(b || ".");
            this.$a = [];
            for (b = 0; b < a.length; b++) this.$a.push(parseInt(a[b], 10))
        }
        I.prototype.compare = function(a) {
            a instanceof I || (a = new I(String(a)));
            for (var b = Math.max(this.$a.length, a.$a.length), c = 0; c < b; c++) {
                var d = this.$a[c],
                    e = a.$a[c];
                if (void 0 !== d && void 0 !== e && d !== e) return d - e;
                if (void 0 === d) return -1;
                if (void 0 === e) return 1
            }
            return 0
        };

        function J(a, b) {
            return 0 <= a.compare(b)
        }

        function Li() {
            var a = window.navigator &&
                window.navigator.userAgent;
            if (a) {
                var b;
                if (b = a.match(Di)) {
                    var c = new I(b[3] || b[1]);
                    return 0 <= a.indexOf("Opera Mini") ? !1 : 0 <= a.indexOf("Opera Mobi") ? 0 <= a.indexOf("Android") && J(c, "10.1") : J(c, "8.0")
                }
                if (b = a.match(Ci)) return J(new I(b[1]), "2.0");
                if (b = a.match(Ei)) return J(new I(b[1]), "6.0");
                if (b = a.match(Fi)) return c = new I(b[6]), a = b[3] && new I(b[3]), b = b[5] && new I(b[5], "_"), (!(!a || !J(a, "6.0")) || !(!b || !J(b, "10.5.6"))) && J(c, "3.0");
                if (b = a.match(Hi)) return J(new I(b[1]), "3.0");
                if (b = a.match(Ii)) return J(new I(b[1],
                    "_"), "4.0");
                if (b = a.match(Ji)) return J(new I(b[1]), "4.7");
                if (b = a.match(Ki)) return c = new I(b[1]), a = new I(b[2]), J(c, "7.0") && J(a, "7.0");
                if (b = a.match(Bi)) return c = new I(b[1]), a = new I(b[2]), J(c, "7.0") && J(a, "6.0");
                if (a.match(Gi)) return !1
            }
            return !0
        }
        var Mi, Ni = new bh;
        Mi = ah(Ni) ? new dh(Ni, "firebaseui") : null;
        var Oi = new Xg(Mi),
            Pi, Qi = new ch;
        Pi = ah(Qi) ? new dh(Qi, "firebaseui") : null;
        var Ri = new Xg(Pi),
            Si = {
                name: "pendingEmailCredential",
                Sa: !1
            },
            Ti = {
                name: "redirectUrl",
                Sa: !1
            },
            Ui = {
                name: "rememberAccount",
                Sa: !1
            },
            Vi = {
                name: "rememberedAccounts",
                Sa: !0
            };

        function Wi(a, b) {
            return (a.Sa ? Oi : Ri).get(b ? a.name + ":" + b : a.name)
        }

        function Xi(a, b) {
            (a.Sa ? Oi : Ri).remove(b ? a.name + ":" + b : a.name)
        }

        function Yi(a, b, c) {
            (a.Sa ? Oi : Ri).set(c ? a.name + ":" + c : a.name, b)
        }

        function Zi(a, b) {
            Yi(Ti, a, b)
        }

        function $i(a, b) {
            Yi(Ui, a, b)
        }

        function aj(a) {
            a = Wi(Vi, a) || [];
            a = Ja(a, function(a) {
                return Yh(a)
            });
            return Ia(a, ca)
        }

        function bj(a, b) {
            var c = aj(b),
                d = La(c, function(b) {
                    return b.J() == a.J() && (b.zc || null) == (a.zc || null)
                }); - 1 < d && Oa(c, d);
            c.unshift(a);
            Yi(Vi, Ja(c, function(a) {
                return a.qb()
            }), b)
        }

        function cj(a) {
            a =
                Wi(Si, a) || null;
            return xi(a)
        }

        function dj() {
            this.g = new ki;
            this.g.define("acUiConfig");
            this.g.define("callbacks");
            this.g.define("credentialHelper", ej);
            this.g.define("popupMode", !1);
            this.g.define("queryParameterForSignInSuccessUrl", "signInSuccessUrl");
            this.g.define("queryParameterForWidgetMode", "mode");
            this.g.define("signInFlow");
            this.g.define("signInOptions");
            this.g.define("signInSuccessUrl");
            this.g.define("siteName");
            this.g.define("tosUrl");
            this.g.define("widgetUrl")
        }
        var ej = "accountchooser.com",
            fj = {
                He: ej,
                NONE: "none"
            },
            gj = {
                Je: "popup",
                Le: "redirect"
            };

        function hj(a) {
            return a.g.get("acUiConfig") || null
        }
        var ij = {
                Ie: "callback",
                Ke: "recoverEmail",
                Me: "resetPassword",
                Ne: "select",
                Oe: "verifyEmail"
            },
            jj = ["sitekey", "tabindex", "callback", "expired-callback"];

        function kj(a) {
            var b = a.g.get("widgetUrl") || window.location.href;
            return lj(a, b)
        }

        function lj(a, b) {
            a = mj(a);
            for (var c = b.search(Vc), d = 0, e, f = []; 0 <= (e = Uc(b, d, a, c));) f.push(b.substring(d, e)), d = Math.min(b.indexOf("&", e) + 1 || c, c);
            f.push(b.substr(d));
            b = [f.join("").replace(Xc,
                "$1"), "&", a];
            b.push("=", encodeURIComponent("select"));
            b[1] && (a = b[0], c = a.indexOf("#"), 0 <= c && (b.push(a.substr(c)), b[0] = a = a.substr(0, c)), c = a.indexOf("?"), 0 > c ? b[1] = "?" : c == a.length - 1 && (b[1] = void 0));
            return b.join("")
        }

        function nj(a) {
            a = a.g.get("signInOptions") || [];
            for (var b = [], c = 0; c < a.length; c++) {
                var d = a[c],
                    d = ha(d) ? d : {
                        provider: d
                    };
                si[d.provider] && b.push(d)
            }
            return b
        }

        function oj(a, b) {
            a = nj(a);
            for (var c = 0; c < a.length; c++)
                if (a[c].provider === b) return a[c];
            return null
        }

        function pj(a) {
            return Ja(nj(a), function(a) {
                return a.provider
            })
        }

        function qj(a) {
            var b = null;
            Ga(nj(a), function(a) {
                a.provider == firebase.auth.PhoneAuthProvider.PROVIDER_ID && ha(a.recaptchaParameters) && !da(a.recaptchaParameters) && (b = $a(a.recaptchaParameters))
            });
            if (b) {
                var c = [];
                Ga(jj, function(a) {
                    "undefined" !== typeof b[a] && (c.push(a), delete b[a])
                });
                c.length && Df && Df.log(yf, 'The following provided "recaptchaParameters" keys are not allowed: ' + c.join(", "), void 0)
            }
            return b
        }

        function rj(a) {
            a = oj(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID);
            var b = null;
            a && n(a.loginHint) && (b =
                zi(a.loginHint));
            return a && a.defaultNationalNumber || b && b.lb || null
        }

        function sj(a) {
            var b = (a = oj(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID)) && a.defaultCountry || null,
                c;
            if (c = b) {
                b = b.toUpperCase();
                c = [];
                for (var d = 0; d < Vh.length; d++) Vh[d].c === b && c.push(Vh[d])
            }
            b = c;
            c = null;
            a && n(a.loginHint) && (c = zi(a.loginHint));
            return b && b[0] || c && Uh(c.wb) || null
        }

        function mj(a) {
            return li(a.g, "queryParameterForWidgetMode")
        }

        function tj(a) {
            return a.g.get("tosUrl") || null
        }

        function uj(a) {
            return (a = oj(a, firebase.auth.EmailAuthProvider.PROVIDER_ID)) &&
                "undefined" !== typeof a.requireDisplayName ? !!a.requireDisplayName : !0
        }

        function vj(a) {
            a = a.g.get("signInFlow");
            for (var b in gj)
                if (gj[b] == a) return gj[b];
            return "redirect"
        }

        function wj(a) {
            return xj(a).uiShown || null
        }

        function xj(a) {
            return a.g.get("callbacks") || {}
        }

        function yj(a) {
            if ("http:" !== (window.location && window.location.protocol) && "https:" !== (window.location && window.location.protocol)) return "none";
            a = a.g.get("credentialHelper");
            for (var b in fj)
                if (fj[b] == a) return fj[b];
            return ej
        }
        dj.prototype.Vb = function(a) {
            for (var b in a) try {
                this.g.update(b,
                    a[b])
            } catch (c) {
                Df && Cf('Invalid config: "' + b + '"')
            }
            kb && this.g.update("popupMode", !1)
        };
        dj.prototype.update = function(a, b) {
            this.g.update(a, b)
        };
        var zj, Aj, Bj, K = {};

        function L(a, b, c, d) {
            K[a].apply(null, Array.prototype.slice.call(arguments, 1))
        }

        function M(a, b) {
            var c;
            c = Fc(a, "firebaseui-textfield");
            b ? (wg(a, "firebaseui-input-invalid"), vg(a, "firebaseui-input"), c && wg(c, "firebaseui-textfield-invalid")) : (wg(a, "firebaseui-input"), vg(a, "firebaseui-input-invalid"), c && vg(c, "firebaseui-textfield-invalid"))
        }

        function Cj(a,
            b, c) {
            b = new Mg(b);
            Fe(a, ma(Ge, b));
            rg(a).ra(b, "input", c)
        }

        function Dj(a, b, c) {
            b = new xg(b);
            Fe(a, ma(Ge, b));
            rg(a).ra(b, "key", function(a) {
                13 == a.keyCode && (a.stopPropagation(), a.preventDefault(), c(a))
            })
        }

        function Ej(a, b, c) {
            b = new Lg(b);
            Fe(a, ma(Ge, b));
            rg(a).ra(b, "focusin", c)
        }

        function Fj(a, b, c) {
            b = new Lg(b);
            Fe(a, ma(Ge, b));
            rg(a).ra(b, "focusout", c)
        }

        function Gj(a, b, c) {
            b = new Gg(b);
            Fe(a, ma(Ge, b));
            rg(a).ra(b, "action", function(a) {
                a.stopPropagation();
                a.preventDefault();
                c(a)
            })
        }

        function Hj(a) {
            vg(a, "firebaseui-hidden")
        }

        function O(a,
            b) {
            b && Ec(a, b);
            wg(a, "firebaseui-hidden")
        }

        function Ij(a) {
            return !ug(a, "firebaseui-hidden") && "none" != a.style.display
        }

        function Jj(a, b, c) {
            Kj.call(this);
            document.body.appendChild(a);
            a.showModal || window.dialogPolyfill.registerDialog(a);
            a.showModal();
            gi(a);
            b && Gj(this, a, function(b) {
                var c = a.getBoundingClientRect();
                (b.clientX < c.left || c.left + c.width < b.clientX || b.clientY < c.top || c.top + c.height < b.clientY) && Kj.call(this)
            });
            if (!c) {
                var d = this.L().parentElement || this.L().parentNode;
                if (d) {
                    var e = this;
                    this.ob = function() {
                        if (a.open) {
                            var b =
                                a.getBoundingClientRect().height,
                                c = d.getBoundingClientRect().height,
                                k = d.getBoundingClientRect().top - document.body.getBoundingClientRect().top,
                                r = d.getBoundingClientRect().left - document.body.getBoundingClientRect().left,
                                N = a.getBoundingClientRect().width,
                                Fa = d.getBoundingClientRect().width;
                            a.style.top = (k + (c - b) / 2).toString() + "px";
                            b = r + (Fa - N) / 2;
                            a.style.left = b.toString() + "px";
                            a.style.right = (document.body.getBoundingClientRect().width - b - N).toString() + "px"
                        } else window.removeEventListener("resize", e.ob)
                    };
                    this.ob();
                    window.addEventListener("resize", this.ob, !1)
                }
            }
        }

        function Kj() {
            var a = Lj.call(this);
            a && (ii(a), a.open && a.close(), Dc(a), this.ob && window.removeEventListener("resize", this.ob))
        }

        function Lj() {
            return xc("firebaseui-id-dialog")
        }

        function Mj() {
            Dc(Nj.call(this))
        }

        function Nj() {
            return this.o("firebaseui-id-info-bar")
        }

        function Oj() {
            return this.o("firebaseui-id-dismiss-info-bar")
        }
        var Pj = {
            Xd: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
            Wd: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg",
            Od: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg",
            Ce: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg",
            ke: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/mail.svg",
            me: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/phone.svg"
        };

        function Qj(a, b, c) {
            Je.call(this, a, b);
            for (var d in c) this[d] = c[d]
        }
        t(Qj, Je);

        function P(a, b, c, d) {
            qg.call(this, c);
            this.pd = a;
            this.od = b;
            this.Ib = !1;
            this.gd = d || null;
            this.ea = this.pb = null
        }
        t(P, qg);
        P.prototype.hc = function() {
            var a =
                rd(this.pd, this.od, Pj, this.Pa());
            gi(a);
            this.j = a
        };
        P.prototype.m = function() {
            P.h.m.call(this);
            oi(Q(this), new Qj("pageEnter", Q(this), {
                pageId: this.gd
            }))
        };
        P.prototype.eb = function() {
            oi(Q(this), new Qj("pageExit", Q(this), {
                pageId: this.gd
            }));
            P.h.eb.call(this)
        };
        P.prototype.f = function() {
            window.clearTimeout(this.pb);
            this.od = this.pd = this.pb = null;
            this.Ib = !1;
            this.ea = null;
            ii(this.L());
            P.h.f.call(this)
        };

        function Rj(a) {
            a.Ib = !0;
            a.pb = window.setTimeout(function() {
                a.L() && null === a.ea && (a.ea = rd(uh, null, null, a.Pa()), a.L().appendChild(a.ea),
                    gi(a.ea))
            }, 500)
        }

        function Sj(a, b, c, d, e) {
            function f() {
                if (a.Na) return null;
                a.Ib = !1;
                window.clearTimeout(a.pb);
                a.pb = null;
                a.ea && (ii(a.ea), Dc(a.ea), a.ea = null)
            }
            if (a.Ib) return null;
            Rj(a);
            return b.apply(null, c).then(d, e).then(f, f)
        }

        function Q(a) {
            return a.L().parentElement || a.L().parentNode
        }

        function Tj(a, b, c) {
            Dj(a, b, function() {
                c.focus()
            })
        }

        function Uj(a, b, c) {
            Dj(a, b, function() {
                c()
            })
        }
        q(P.prototype, {
            F: function(a) {
                Mj.call(this);
                var b = rd(qh, {
                    message: a
                }, null, this.Pa());
                this.L().appendChild(b);
                Gj(this, Oj.call(this),
                    function() {
                        Dc(b)
                    })
            },
            Te: Mj,
            We: Nj,
            Ve: Oj,
            Wb: function(a, b) {
                a = rd(sh, {
                    Gb: a,
                    message: b
                }, null, this.Pa());
                Jj.call(this, a)
            },
            za: Kj,
            Ue: Lj
        });

        function Vj() {
            return this.o("firebaseui-id-submit")
        }

        function Wj() {
            return this.o("firebaseui-id-secondary-link")
        }

        function Xj(a, b) {
            var c = Vj.call(this);
            Gj(this, c, function(b) {
                a(b)
            });
            (c = Wj.call(this)) && b && Gj(this, c, function(a) {
                b(a)
            })
        }

        function Yj() {
            return this.o("firebaseui-id-password")
        }

        function Zj() {
            return this.o("firebaseui-id-password-error")
        }

        function ak() {
            var a = Yj.call(this),
                b = Zj.call(this);
            Cj(this, a, function() {
                Ij(b) && (M(a, !0), Hj(b))
            })
        }

        function bk() {
            var a = Yj.call(this),
                b;
            b = Zj.call(this);
            G(a) ? (M(a, !0), Hj(b), b = !0) : (M(a, !1), O(b, D("Enter your password").toString()), b = !1);
            return b ? G(a) : null
        }

        function ck(a, b, c, d) {
            P.call(this, Ch, {
                email: a
            }, d, "passwordLinking");
            this.l = b;
            this.Ob = c
        }
        t(ck, P);
        ck.prototype.m = function() {
            this.uc();
            this.A(this.l, this.Ob);
            Uj(this, this.aa(), this.l);
            this.aa().focus();
            ck.h.m.call(this)
        };
        ck.prototype.f = function() {
            this.l = null;
            ck.h.f.call(this)
        };
        ck.prototype.ma =
            function() {
                return G(this.o("firebaseui-id-email"))
            };
        q(ck.prototype, {
            aa: Yj,
            oc: Zj,
            uc: ak,
            gc: bk,
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function dk() {
            return this.o("firebaseui-id-email")
        }

        function ek() {
            return this.o("firebaseui-id-email-error")
        }

        function fk(a) {
            var b = dk.call(this),
                c = ek.call(this);
            Cj(this, b, function() {
                Ij(c) && (M(b, !0), Hj(c))
            });
            a && Dj(this, b, function() {
                a()
            })
        }

        function gk() {
            return sa(G(dk.call(this)) || "")
        }

        function hk() {
            var a = dk.call(this),
                b;
            b = ek.call(this);
            var c = G(a) || "";
            c ? Pg.test(c) ? (M(a, !0), Hj(b), b = !0) : (M(a, !1),
                O(b, D("That email address isn't correct").toString()), b = !1) : (M(a, !1), O(b, D("Enter your email address to continue").toString()), b = !1);
            return b ? sa(G(a)) : null
        }

        function ik(a, b, c, d) {
            P.call(this, xh, {
                email: c
            }, d, "passwordSignIn");
            this.l = a;
            this.Ob = b
        }
        t(ik, P);
        ik.prototype.m = function() {
            this.Ea();
            this.uc();
            this.A(this.l, this.Ob);
            Tj(this, this.w(), this.aa());
            Uj(this, this.aa(), this.l);
            G(this.w()) ? this.aa().focus() : this.w().focus();
            ik.h.m.call(this)
        };
        ik.prototype.f = function() {
            this.Ob = this.l = null;
            ik.h.f.call(this)
        };
        q(ik.prototype, {
            w: dk,
            Qa: ek,
            Ea: fk,
            J: gk,
            ma: hk,
            aa: Yj,
            oc: Zj,
            uc: ak,
            gc: bk,
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function R(a, b, c, d, e) {
            P.call(this, a, b, d, e || "notice");
            this.ha = c || null
        }
        t(R, P);
        R.prototype.m = function() {
            this.ha && (this.A(this.ha), this.D().focus());
            R.h.m.call(this)
        };
        R.prototype.f = function() {
            this.ha = null;
            R.h.f.call(this)
        };
        q(R.prototype, {
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function jk(a, b, c) {
            R.call(this, Ah, {
                email: a,
                N: !!b
            }, b, c, "passwordRecoveryEmailSent")
        }
        t(jk, R);

        function kk(a, b) {
            R.call(this, Jh, {
                N: !!a
            }, a, b, "emailVerificationSuccess")
        }
        t(kk, R);

        function lk(a, b) {
            R.call(this, Kh, {
                N: !!a
            }, a, b, "emailVerificationFailure")
        }
        t(lk, R);

        function mk(a, b) {
            R.call(this, Fh, {
                N: !!a
            }, a, b, "passwordResetSuccess")
        }
        t(mk, R);

        function nk(a, b) {
            R.call(this, Gh, {
                N: !!a
            }, a, b, "passwordResetFailure")
        }
        t(nk, R);

        function ok(a, b) {
            R.call(this, Ih, {
                N: !!a
            }, a, b, "emailChangeRevokeFailure")
        }
        t(ok, R);

        function pk(a, b) {
            R.call(this, Lh, {
                Ld: a
            }, void 0, b, "unrecoverableError")
        }
        t(pk, R);
        var qk = !1,
            rk = null;

        function sk(a, b) {
            qk = !!b;
            rk || ("undefined" == typeof accountchooser && Li() ? (b = gc(), rk = se(pe(Qg(b)),
                function() {})) : rk = pe());
            rk.then(a, a)
        }

        function tk(a, b) {
            a = S(a);
            (a = xj(a).accountChooserInvoked || null) ? a(b): b()
        }

        function uk(a, b, c) {
            a = S(a);
            (a = xj(a).accountChooserResult || null) ? a(b, c): c()
        }

        function vk(a, b, c, d, e) {
            d ? (L("callback", a, b), qk && c()) : tk(a, function() {
                di(function(d) {
                    uk(a, d ? "empty" : "unavailable", function() {
                        L("signIn", a, b);
                        (d || qk) && c()
                    })
                }, aj(T(a)), e)
            })
        }

        function wk(a, b, c, d) {
            function e(a) {
                a = U(a);
                V(b, c, void 0, a);
                d()
            }
            uk(b, "accountSelected", function() {
                $i(!1, T(b));
                W(b, X(b).fetchProvidersForEmail(a.J()).then(function(e) {
                    xk(b,
                        c, e, a.J(), a.Pc || null || void 0);
                    d()
                }, e))
            })
        }

        function yk(a, b, c, d) {
            uk(b, a ? "addAccount" : "unavailable", function() {
                L("signIn", b, c);
                (a || qk) && d()
            })
        }

        function zk(a, b, c, d) {
            function e() {
                var b = a();
                b && (b = wj(S(b))) && b()
            }
            ai(function() {
                var f = a();
                f && vk(f, b, e, c, d)
            }, function(c) {
                var d = a();
                d && wk(c, d, b, e)
            }, function(c) {
                var d = a();
                d && yk(c, d, b, e)
            }, a() && hj(S(a())))
        }

        function Ak(a, b, c, d, e) {
            if (e) Bk(a, Ck(a).currentUser, c);
            else {
                if (!c) throw Error("No credential found!");
                var f = c;
                c.providerId && "password" == c.providerId && (f = null);
                var g =
                    function(c) {
                        if (!c.name || "cancel" != c.name) {
                            var d;
                            a: {
                                var e = c.message;
                                try {
                                    var f = ((JSON.parse(e).error || {}).message || "").toLowerCase().match(/invalid.+(access|id)_token/);
                                    if (f && f.length) {
                                        d = !0;
                                        break a
                                    }
                                } catch (g$4) {}
                                d = !1
                            }
                            d ? (c = Q(b), b.i(), V(a, c, void 0, D("Your sign-in session has expired. Please try again.").toString())) : (d = c && c.message || "", c.code && (d = U(c)), b.F(d))
                        }
                    },
                    k = X(a).currentUser || d;
                if (!k) throw Error("User not logged in.");
                W(a, X(a).signOut().then(function() {
                    var b = new Xh(k.email, k.displayName, k.photoURL,
                        f && f.providerId);
                    null != Wi(Ui, T(a)) && !Wi(Ui, T(a)) || bj(b, T(a));
                    Xi(Ui, T(a));
                    W(a, Ck(a).signInWithCredential(c).then(function(b) {
                        Bk(a, b, f)
                    }, g).then(function() {}, g))
                }, g))
            }
        }

        function Bk(a, b, c) {
            var d;
            d = S(a);
            d = xj(d).signInSuccess || null;
            var e = T(a),
                e = Wi(Ti, e) || null || void 0;
            Xi(Ti, T(a));
            var f = !1,
                g;
            a: {
                try {
                    g = !!(window.opener && window.opener.location && window.opener.location.assign && window.opener.location.hostname === window.location.hostname && window.opener.location.protocol === window.location.protocol);
                    break a
                } catch (k) {}
                g = !1
            }
            if (g) {
                if (!d || d(b, c, e)) f = !0, window.opener.location.assign(Dk(a, e));
                d || window.close()
            } else if (!d || d(b, c, e)) f = !0, window.location.assign(Dk(a, e));
            f || a.reset()
        }

        function Dk(a, b) {
            a = b || S(a).g.get("signInSuccessUrl");
            if (!a) throw Error("No redirect URL has been found. You must either specify a signInSuccessUrl in the configuration, pass in a redirect URL to the widget URL, or return false from the callback.");
            return a
        }

        function U(a) {
            var b = "";
            switch (a.code) {
                case "auth/email-already-in-use":
                    b += "The email address is already used by another account";
                    break;
                case "auth/requires-recent-login":
                    b += Sh();
                    break;
                case "auth/too-many-requests":
                    b += "You have entered an incorrect password too many times. Please try again in a few minutes.";
                    break;
                case "auth/user-cancelled":
                    b += "Please authorize the required permissions to sign in to the application";
                    break;
                case "auth/user-not-found":
                    b += "That email address doesn't match an existing account";
                    break;
                case "auth/user-token-expired":
                    b += Sh();
                    break;
                case "auth/weak-password":
                    b += "Strong passwords have at least 6 characters and a mix of letters and numbers";
                    break;
                case "auth/wrong-password":
                    b += "The email and password you entered don't match";
                    break;
                case "auth/network-request-failed":
                    b += "A network error has occurred";
                    break;
                case "auth/invalid-phone-number":
                    b += Qh();
                    break;
                case "auth/invalid-verification-code":
                    b += D("Wrong code. Try again.");
                    break;
                case "auth/code-expired":
                    b += "This code is no longer valid"
            }
            if (b = D(b).toString()) return b;
            try {
                return JSON.parse(a.message), Df && Cf("Internal error: " + a.message), D("Something went wrong. Please try again.").toString()
            } catch (c) {
                return a.message
            }
        }

        function Ek(a, b, c) {
            var d = si[b] && firebase.auth[si[b]] ? new firebase.auth[si[b]] : null;
            if (!d) throw Error("Invalid Firebase Auth provider!");
            var e;
            e = S(a);
            e = (e = oj(e, b)) && e.scopes;
            e = da(e) ? e : [];
            if (d && d.addScope)
                for (var f = 0; f < e.length; f++) d.addScope(e[f]);
            a = S(a);
            a = (a = oj(a, b)) && a.customParameters;
            ha(a) ? (a = $a(a), b === firebase.auth.GoogleAuthProvider.PROVIDER_ID && delete a.login_hint) : a = null;
            b == firebase.auth.GoogleAuthProvider.PROVIDER_ID && c && (a = a || {}, a.login_hint = c);
            a && d && d.setCustomParameters && d.setCustomParameters(a);
            return d
        }

        function Fk(a, b, c, d) {
            function e() {
                W(a, Sj(b, p(X(a).signInWithRedirect, X(a)), [k], function() {
                    if ("file:" === (window.location && window.location.protocol)) return W(a, X(a).getRedirectResult().then(function(c) {
                        b.i();
                        L("callback", a, g, pe(c))
                    }, f))
                }, f))
            }

            function f(a) {
                a.name && "cancel" == a.name || (Df && Cf("signInWithRedirect: " + a.code), a = U(a), b.F(a))
            }
            var g = Q(b),
                k = Ek(a, c, d);
            "redirect" == vj(S(a)) ? e() : W(a, X(a).signInWithPopup(k).then(function(c) {
                b.i();
                L("callback", a, g, pe(c))
            }, function(c) {
                if (!c.name || "cancel" !=
                    c.name) switch (c.code) {
                    case "auth/popup-blocked":
                        e();
                        break;
                    case "auth/popup-closed-by-user":
                    case "auth/cancelled-popup-request":
                        break;
                    case "auth/network-request-failed":
                    case "auth/too-many-requests":
                    case "auth/user-cancelled":
                        b.F(U(c));
                        break;
                    default:
                        b.i(), L("callback", a, g, qe(c))
                }
            }))
        }

        function Gk(a, b) {
            var c = b.ma(),
                d = b.gc();
            if (c)
                if (d) {
                    var e = firebase.auth.EmailAuthProvider.credential(c, d);
                    W(a, Sj(b, p(X(a).signInWithEmailAndPassword, X(a)), [c, d], function() {
                        Ak(a, b, e)
                    }, function(a) {
                        if (!a.name || "cancel" != a.name) switch (a.code) {
                            case "auth/email-exists":
                                M(b.w(), !1);
                                O(b.Qa(), U(a));
                                break;
                            case "auth/too-many-requests":
                            case "auth/wrong-password":
                                M(b.aa(), !1);
                                O(b.oc(), U(a));
                                break;
                            default:
                                Df && Cf("verifyPassword: " + a.message), b.F(U(a))
                        }
                    }))
                } else b.aa().focus();
            else b.w().focus()
        }

        function Hk(a) {
            a = pj(S(a));
            return 1 == a.length && a[0] == firebase.auth.EmailAuthProvider.PROVIDER_ID
        }

        function Ik(a) {
            a = pj(S(a));
            return 1 == a.length && a[0] == firebase.auth.PhoneAuthProvider.PROVIDER_ID
        }

        function V(a, b, c, d) {
            Hk(a) ? d ? L("signIn", a, b, c, d) : Jk(a, b, c) : a && Ik(a) && !d ? L("phoneSignInStart", a, b) :
                L("providerSignIn", a, b, d)
        }

        function Kk(a, b, c, d) {
            var e = Q(b);
            W(a, Sj(b, p(X(a).fetchProvidersForEmail, X(a)), [c], function(f) {
                $i(yj(S(a)) == ej, T(a));
                b.i();
                xk(a, e, f, c, void 0, d)
            }, function(a) {
                a = U(a);
                b.F(a)
            }))
        }

        function xk(a, b, c, d, e, f) {
            if (c.length)
                if (Ma(c, firebase.auth.EmailAuthProvider.PROVIDER_ID)) L("passwordSignIn", a, b, d);
                else {
                    e = new wi(d);
                    var g = T(a);
                    Yi(Si, e.qb(), g);
                    L("federatedSignIn", a, b, d, c[0], f)
                }
            else L("passwordSignUp", a, b, d, e)
        }

        function Jk(a, b, c) {
            yj(S(a)) == ej ? sk(function() {
                Zh ? tk(a, function() {
                    di(function(d) {
                        uk(a,
                            d ? "empty" : "unavailable",
                            function() {
                                L("signIn", a, b, c)
                            })
                    }, aj(T(a)), kj(S(a)))
                }) : (Y(a), zk(Lk, b, !1, kj(S(a))))
            }, !1) : (qk = !1, tk(a, function() {
                uk(a, "unavailable", function() {
                    L("signIn", a, b, c)
                })
            }))
        }

        function Mk(a) {
            var b = window.location.href;
            a = mj(S(a));
            var b = Wc(b, a) || "",
                c;
            for (c in ij)
                if (ij[c].toLowerCase() == b.toLowerCase()) return ij[c];
            return "callback"
        }

        function Nk(a) {
            var b = window.location.href;
            a = li(S(a).g, "queryParameterForSignInSuccessUrl");
            return Wc(b, a)
        }

        function Ok() {
            return Wc(window.location.href, "oobCode")
        }

        function Pk() {
            var a = Wc(window.location.href, "continueUrl");
            return a ? function() {
                window.location.assign(a)
            } : null
        }

        function Qk(a, b) {
            var c = fi(b);
            switch (Mk(a)) {
                case "callback":
                    (b = Nk(a)) && Zi(b, T(a));
                    L("callback", a, c);
                    break;
                case "resetPassword":
                    L("passwordReset", a, c, Ok(), Pk());
                    break;
                case "recoverEmail":
                    L("emailChangeRevocation", a, c, Ok());
                    break;
                case "verifyEmail":
                    L("emailVerification", a, c, Ok(), Pk());
                    break;
                case "select":
                    if ((b = Nk(a)) && Zi(b, T(a)), Zh) {
                        V(a, c);
                        break
                    } else {
                        sk(function() {
                            Y(a);
                            zk(Lk, c, !0)
                        }, !0);
                        return
                    }
                default:
                    throw Error("Unhandled widget operation.");
            }(b = wj(S(a))) && b()
        }

        function Rk(a) {
            P.call(this, Bh, void 0, a, "callback")
        }
        t(Rk, P);

        function Sk(a, b, c) {
            if (c.user) {
                var d = cj(T(a)),
                    e = d && d.J();
                if (e && !Tk(c.user, e)) Uk(a, b, c.user, c.credential);
                else {
                    var f = d && d.ya;
                    f ? W(a, c.user.linkWithCredential(f).then(function() {
                        Vk(a, b, f)
                    }, function(c) {
                        Wk(a, b, c)
                    })) : Vk(a, b, c.credential)
                }
            } else c = Q(b), b.i(), Xi(Si, T(a)), V(a, c)
        }

        function Vk(a, b, c) {
            Xi(Si, T(a));
            Ak(a, b, c)
        }

        function Wk(a, b, c) {
            var d = Q(b);
            Xi(Si, T(a));
            c = U(c);
            b.i();
            V(a, d, void 0, c)
        }

        function Xk(a, b, c, d) {
            var e = Q(b);
            W(a, X(a).fetchProvidersForEmail(c).then(function(f) {
                b.i();
                f.length ? "password" == f[0] ? L("passwordLinking", a, e, c) : L("federatedLinking", a, e, c, f[0], d) : (Xi(Si, T(a)), L("passwordRecovery", a, e, c, !1, Rh().toString()))
            }, function(c) {
                Wk(a, b, c)
            }))
        }

        function Uk(a, b, c, d) {
            var e = Q(b);
            W(a, X(a).signOut().then(function() {
                b.i();
                L("emailMismatch", a, e, c, d)
            }, function(a) {
                a.name && "cancel" == a.name || (a = U(a.code), b.F(a))
            }))
        }

        function Tk(a, b) {
            if (b == a.email) return !0;
            if (a.providerData)
                for (var c = 0; c < a.providerData.length; c++)
                    if (b == a.providerData[c].email) return !0;
            return !1
        }
        K.callback = function(a,
            b, c) {
            var d = new Rk;
            d.render(b);
            Z(a, d);
            b = c || a.getRedirectResult();
            W(a, b.then(function(b) {
                Sk(a, d, b)
            }, function(b) {
                if (b && "auth/account-exists-with-different-credential" == b.code && b.email && b.credential) {
                    var c = xi(b),
                        g = T(a);
                    Yi(Si, c.qb(), g);
                    Xk(a, d, b.email)
                } else b && "auth/user-cancelled" == b.code ? (c = cj(T(a)), g = U(b), c && c.ya ? Xk(a, d, c.J(), g) : c ? Kk(a, d, c.J(), g) : Wk(a, d, b)) : b && "auth/operation-not-supported-in-this-environment" == b.code && Hk(a) ? Sk(a, d, {
                    user: null,
                    credential: null
                }) : Wk(a, d, b)
            }))
        };

        function Yk(a, b, c, d) {
            P.call(this,
                Hh, {
                    email: a,
                    N: !!c
                }, d, "emailChangeRevoke");
            this.ed = b;
            this.ha = c || null
        }
        t(Yk, P);
        Yk.prototype.m = function() {
            var a = this;
            Gj(this, this.o("firebaseui-id-reset-password-link"), function() {
                a.ed()
            });
            this.ha && (this.A(this.ha), this.D().focus());
            Yk.h.m.call(this)
        };
        Yk.prototype.f = function() {
            this.ed = this.ha = null;
            Yk.h.f.call(this)
        };
        q(Yk.prototype, {
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function Zk() {
            return this.o("firebaseui-id-new-password")
        }

        function $k() {
            return this.o("firebaseui-id-password-toggle")
        }

        function al() {
            this.vc = !this.vc;
            var a =
                $k.call(this),
                b = Zk.call(this);
            this.vc ? (b.type = "text", vg(a, "firebaseui-input-toggle-off"), wg(a, "firebaseui-input-toggle-on")) : (b.type = "password", vg(a, "firebaseui-input-toggle-on"), wg(a, "firebaseui-input-toggle-off"));
            b.focus()
        }

        function bl() {
            return this.o("firebaseui-id-new-password-error")
        }

        function cl() {
            this.vc = !1;
            var a = Zk.call(this);
            a.type = "password";
            var b = bl.call(this);
            Cj(this, a, function() {
                Ij(b) && (M(a, !0), Hj(b))
            });
            var c = $k.call(this);
            vg(c, "firebaseui-input-toggle-on");
            wg(c, "firebaseui-input-toggle-off");
            Ej(this, a, function() {
                vg(c, "firebaseui-input-toggle-focus");
                wg(c, "firebaseui-input-toggle-blur")
            });
            Fj(this, a, function() {
                vg(c, "firebaseui-input-toggle-blur");
                wg(c, "firebaseui-input-toggle-focus")
            });
            Gj(this, c, p(al, this))
        }

        function dl() {
            var a = Zk.call(this),
                b;
            b = bl.call(this);
            G(a) ? (M(a, !0), Hj(b), b = !0) : (M(a, !1), O(b, D("Enter your password").toString()), b = !1);
            return b ? G(a) : null
        }

        function el(a, b, c) {
            P.call(this, Eh, {
                email: a
            }, c, "passwordReset");
            this.l = b
        }
        t(el, P);
        el.prototype.m = function() {
            this.tc();
            this.A(this.l);
            Uj(this, this.U(), this.l);
            this.U().focus();
            el.h.m.call(this)
        };
        el.prototype.f = function() {
            this.l = null;
            el.h.f.call(this)
        };
        q(el.prototype, {
            U: Zk,
            nc: bl,
            Rd: $k,
            tc: cl,
            fc: dl,
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function fl(a, b, c, d, e) {
            var f = c.fc();
            f && W(a, Sj(c, p(X(a).confirmPasswordReset, X(a)), [d, f], function() {
                c.i();
                var d = new mk(e);
                d.render(b);
                Z(a, d)
            }, function(d) {
                gl(a, b, c, d)
            }))
        }

        function gl(a, b, c, d) {
            "auth/weak-password" == (d && d.code) ? (a = U(d), M(c.U(), !1), O(c.nc(), a), c.U().focus()) : (c && c.i(), c = new nk, c.render(b), Z(a, c))
        }

        function hl(a,
            b, c) {
            var d = new Yk(c, function() {
                W(a, Sj(d, p(X(a).sendPasswordResetEmail, X(a)), [c], function() {
                    d.i();
                    d = new jk(c);
                    d.render(b);
                    Z(a, d)
                }, function() {
                    d.F(D("Unable to send password reset code to specified email").toString())
                }))
            });
            d.render(b);
            Z(a, d)
        }
        K.passwordReset = function(a, b, c, d) {
            W(a, X(a).verifyPasswordResetCode(c).then(function(e) {
                var f = new el(e, function() {
                    fl(a, b, f, c, d)
                });
                f.render(b);
                Z(a, f)
            }, function() {
                gl(a, b)
            }))
        };
        K.emailChangeRevocation = function(a, b, c) {
            var d = null;
            W(a, X(a).checkActionCode(c).then(function(b) {
                d =
                    b.data.email;
                return X(a).applyActionCode(c)
            }).then(function() {
                hl(a, b, d)
            }, function() {
                var c = new ok;
                c.render(b);
                Z(a, c)
            }))
        };
        K.emailVerification = function(a, b, c, d) {
            W(a, X(a).applyActionCode(c).then(function() {
                var c = new kk(d);
                c.render(b);
                Z(a, c)
            }, function() {
                var c = new lk;
                c.render(b);
                Z(a, c)
            }))
        };

        function il(a, b, c, d, e) {
            P.call(this, Mh, {
                Fe: a,
                le: b
            }, e, "emailMismatch");
            this.ha = c;
            this.I = d
        }
        t(il, P);
        il.prototype.m = function() {
            this.A(this.ha, this.I);
            this.D().focus();
            il.h.m.call(this)
        };
        il.prototype.f = function() {
            this.I = this.l =
                null;
            il.h.f.call(this)
        };
        q(il.prototype, {
            D: Vj,
            ba: Wj,
            A: Xj
        });
        K.emailMismatch = function(a, b, c, d) {
            var e = cj(T(a));
            if (e) {
                var f = new il(c.email, e.J(), function() {
                    var b = f;
                    Xi(Si, T(a));
                    Ak(a, b, d, c)
                }, function() {
                    var b = d.providerId,
                        c = Q(f);
                    f.i();
                    e.ya ? L("federatedLinking", a, c, e.J(), b) : L("federatedSignIn", a, c, e.J(), b)
                });
                f.render(b);
                Z(a, f)
            } else V(a, b)
        };

        function jl(a, b, c, d) {
            P.call(this, Dh, {
                email: a,
                providerId: b
            }, d, "federatedLinking");
            this.l = c
        }
        t(jl, P);
        jl.prototype.m = function() {
            this.A(this.l);
            this.D().focus();
            jl.h.m.call(this)
        };
        jl.prototype.f = function() {
            this.l = null;
            jl.h.f.call(this)
        };
        q(jl.prototype, {
            D: Vj,
            A: Xj
        });
        K.federatedLinking = function(a, b, c, d, e) {
            var f = cj(T(a));
            if (f && f.ya) {
                var g = new jl(c, d, function() {
                    Fk(a, g, d, c)
                });
                g.render(b);
                Z(a, g);
                e && g.F(e)
            } else V(a, b)
        };
        K.federatedSignIn = function(a, b, c, d, e) {
            var f = new jl(c, d, function() {
                Fk(a, f, d, c)
            });
            f.render(b);
            Z(a, f);
            e && f.F(e)
        };

        function kl(a, b, c, d) {
            var e = b.gc();
            e ? W(a, Sj(b, p(X(a).signInWithEmailAndPassword, X(a)), [c, e], function(c) {
                return W(a, c.linkWithCredential(d).then(function() {
                    Ak(a,
                        b, d)
                }))
            }, function(a) {
                if (!a.name || "cancel" != a.name) switch (a.code) {
                    case "auth/wrong-password":
                        M(b.aa(), !1);
                        O(b.oc(), U(a));
                        break;
                    case "auth/too-many-requests":
                        b.F(U(a));
                        break;
                    default:
                        Df && Cf("signInWithEmailAndPassword: " + a.message), b.F(U(a))
                }
            })) : b.aa().focus()
        }
        K.passwordLinking = function(a, b, c) {
            var d = cj(T(a));
            Xi(Si, T(a));
            var e = d && d.ya;
            if (e) {
                var f = new ck(c, function() {
                    kl(a, f, c, e)
                }, function() {
                    f.i();
                    L("passwordRecovery", a, b, c)
                });
                f.render(b);
                Z(a, f)
            } else V(a, b)
        };

        function ll(a, b, c, d) {
            P.call(this, zh, {
                email: c,
                ac: !!b
            }, d, "passwordRecovery");
            this.l = a;
            this.I = b
        }
        t(ll, P);
        ll.prototype.m = function() {
            this.Ea();
            this.A(this.l, this.I);
            G(this.w()) || this.w().focus();
            Uj(this, this.w(), this.l);
            ll.h.m.call(this)
        };
        ll.prototype.f = function() {
            this.I = this.l = null;
            ll.h.f.call(this)
        };
        q(ll.prototype, {
            w: dk,
            Qa: ek,
            Ea: fk,
            J: gk,
            ma: hk,
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function ml(a, b) {
            var c = b.ma();
            if (c) {
                var d = Q(b);
                W(a, Sj(b, p(X(a).sendPasswordResetEmail, X(a)), [c], function() {
                    b.i();
                    var e = new jk(c, function() {
                        e.i();
                        V(a, d)
                    });
                    e.render(d);
                    Z(a, e)
                }, function(a) {
                    M(b.w(), !1);
                    O(b.Qa(), U(a))
                }))
            } else b.w().focus()
        }
        K.passwordRecovery = function(a, b, c, d, e) {
            var f = new ll(function() {
                ml(a, f)
            }, d ? void 0 : function() {
                f.i();
                V(a, b)
            }, c);
            f.render(b);
            Z(a, f);
            e && f.F(e)
        };
        K.passwordSignIn = function(a, b, c) {
            var d = new ik(function() {
                Gk(a, d)
            }, function() {
                var c = d.J();
                d.i();
                L("passwordRecovery", a, b, c)
            }, c);
            d.render(b);
            Z(a, d)
        };

        function nl() {
            return this.o("firebaseui-id-name")
        }

        function ol() {
            return this.o("firebaseui-id-name-error")
        }

        function pl(a, b, c, d, e, f, g) {
            P.call(this, yh, {
                email: e,
                qe: b,
                name: f,
                rb: a,
                ac: !!d
            }, g, "passwordSignUp");
            this.l = c;
            this.I = d;
            this.Ac = b
        }
        t(pl, P);
        pl.prototype.m = function() {
            this.Ea();
            this.Ac && this.be();
            this.tc();
            this.A(this.l, this.I);
            this.Ja();
            pl.h.m.call(this)
        };
        pl.prototype.f = function() {
            this.I = this.l = null;
            pl.h.f.call(this)
        };
        pl.prototype.Ja = function() {
            this.Ac ? (Tj(this, this.w(), this.gb()), Tj(this, this.gb(), this.U())) : Tj(this, this.w(), this.U());
            this.l && Uj(this, this.U(), this.l);
            G(this.w()) ? this.Ac && !G(this.gb()) ? this.gb().focus() : this.U().focus() : this.w().focus()
        };
        q(pl.prototype, {
            w: dk,
            Qa: ek,
            Ea: fk,
            J: gk,
            ma: hk,
            gb: nl,
            Xe: ol,
            be: function() {
                var a = nl.call(this),
                    b = ol.call(this);
                Cj(this, a, function() {
                    Ij(b) && (M(a, !0), Hj(b))
                })
            },
            Cd: function() {
                var a = nl.call(this),
                    b;
                b = ol.call(this);
                var c = G(a),
                    c = !/^[\s\xa0]*$/.test(null == c ? "" : String(c));
                M(a, c);
                c ? (Hj(b), b = !0) : (O(b, D("Enter your account name").toString()), b = !1);
                return b ? sa(G(a)) : null
            },
            U: Zk,
            nc: bl,
            Rd: $k,
            tc: cl,
            fc: dl,
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function ql(a, b) {
            var c = uj(S(a)),
                d = b.ma(),
                e = null;
            c && (e = b.Cd());
            var f = b.fc();
            if (d)
                if (c && !e) b.gb().focus();
                else if (f) {
                var g =
                    firebase.auth.EmailAuthProvider.credential(d, f);
                W(a, Sj(b, p(X(a).createUserWithEmailAndPassword, X(a)), [d, f], function(d) {
                    return c ? W(a, d.updateProfile({
                        displayName: e
                    }).then(function() {
                        Ak(a, b, g)
                    })) : Ak(a, b, g)
                }, function(c) {
                    if (!c.name || "cancel" != c.name) {
                        var e = U(c);
                        switch (c.code) {
                            case "auth/email-already-in-use":
                                return rl(a, b, d, c);
                            case "auth/too-many-requests":
                                e = D("Too many account requests are coming from your IP address. Try again in a few minutes.").toString();
                            case "auth/operation-not-allowed":
                            case "auth/weak-password":
                                M(b.U(), !1);
                                O(b.nc(), e);
                                break;
                            default:
                                c = "setAccountInfo: " + mf(c), Df && Cf(c), b.F(e)
                        }
                    }
                }))
            } else b.U().focus();
            else b.w().focus()
        }

        function rl(a, b, c, d) {
            function e() {
                var a = U(d);
                M(b.w(), !1);
                O(b.Qa(), a);
                b.w().focus()
            }
            var f = X(a).fetchProvidersForEmail(c).then(function(d) {
                d.length ? e() : (d = Q(b), b.i(), L("passwordRecovery", a, d, c, !1, Rh().toString()))
            }, function() {
                e()
            });
            W(a, f);
            return f
        }
        K.passwordSignUp = function(a, b, c, d, e) {
            function f() {
                g.i();
                V(a, b)
            }
            var g = new pl(tj(S(a)), uj(S(a)), function() {
                ql(a, g)
            }, e ? void 0 : f, c, d);
            g.render(b);
            Z(a, g)
        };

        function sl() {
            return this.o("firebaseui-id-phone-confirmation-code")
        }

        function tl() {
            return this.o("firebaseui-id-phone-confirmation-code-error")
        }

        function ul() {
            return this.o("firebaseui-id-resend-countdown")
        }

        function vl(a, b, c, d, e, f, g, k) {
            P.call(this, Ph, {
                phoneNumber: e,
                rb: g
            }, k, "phoneSignInFinish");
            this.re = f;
            this.Ia = new jf(1E3);
            this.Bc = f;
            this.bd = a;
            this.l = b;
            this.I = c;
            this.dd = d
        }
        t(vl, P);
        vl.prototype.m = function() {
            var a = this;
            this.sd(this.re);
            Ve(this.Ia, "tick", this.rc, !1, this);
            this.Ia.start();
            Gj(this,
                this.o("firebaseui-id-change-phone-number-link"),
                function() {
                    a.bd()
                });
            Gj(this, this.Tc(), function() {
                a.dd()
            });
            this.ce(this.l);
            this.A(this.l, this.I);
            this.Ja();
            vl.h.m.call(this)
        };
        vl.prototype.f = function() {
            this.dd = this.I = this.l = this.bd = null;
            this.Ia.stop();
            cf(this.Ia, "tick", this.rc);
            this.Ia = null;
            vl.h.f.call(this)
        };
        vl.prototype.rc = function() {
            --this.Bc;
            0 < this.Bc ? this.sd(this.Bc) : (this.Ia.stop(), cf(this.Ia, "tick", this.rc), this.Zd(), this.ve())
        };
        vl.prototype.Ja = function() {
            this.pc().focus()
        };
        q(vl.prototype, {
            pc: sl,
            Sd: tl,
            ce: function(a) {
                var b = sl.call(this),
                    c = tl.call(this);
                Cj(this, b, function() {
                    Ij(c) && (M(b, !0), Hj(c))
                });
                a && Dj(this, b, function() {
                    a()
                })
            },
            Dd: function() {
                var a = sa(G(sl.call(this)) || "");
                return /^\d{6}$/.test(a) ? a : null
            },
            Vd: ul,
            sd: function(a) {
                var b = ul.call(this);
                Ec(b, D("Resend code in " + ((9 < a ? "0:" : "0:0") + a)).toString())
            },
            Zd: function() {
                var a = this.Vd();
                Hj(a)
            },
            Tc: function() {
                return this.o("firebaseui-id-resend-link")
            },
            ve: function() {
                var a = this.Tc();
                O(a)
            },
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function wl(a, b, c, d) {
            function e(a) {
                b.pc().focus();
                M(b.pc(), !1);
                O(b.Sd(), a)
            }
            var f = b.Dd();
            f ? (b.Wb("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", D("Verifying...").toString()), W(a, Sj(b, p(d.confirm, d), [f], function() {
                b.za();
                b.Wb("firebaseui-icon-done", D("Verified!").toString());
                var c = setTimeout(function() {
                    b.za();
                    b.i();
                    Ak(a, b, null, null, !0)
                }, 1E3);
                W(a, function() {
                    b && b.za();
                    clearTimeout(c)
                })
            }, function(d) {
                b.za();
                if (!d.name || "cancel" != d.name) {
                    var f = U(d);
                    switch (d.code) {
                        case "auth/code-expired":
                            d = Q(b);
                            b.i();
                            L("phoneSignInStart", a, d, c, f);
                            break;
                        case "auth/missing-verification-code":
                        case "auth/invalid-verification-code":
                            e(f);
                            break;
                        default:
                            b.F(f)
                    }
                }
            }))) : e(D("Wrong code. Try again.").toString())
        }
        K.phoneSignInFinish = function(a, b, c, d, e, f) {
            var g = new vl(function() {
                g.i();
                L("phoneSignInStart", a, b, c)
            }, function() {
                wl(a, g, c, e)
            }, function() {
                g.i();
                V(a, b)
            }, function() {
                g.i();
                L("phoneSignInStart", a, b, c)
            }, Ai(c), d, tj(S(a)));
            g.render(b);
            Z(a, g);
            f && g.F(f)
        };

        function xl(a, b, c) {
            a = rd(th, {
                items: a
            }, null, this.Pa());
            Jj.call(this,
                a, !0, !0);
            c && (c = yl(a, c)) && (c.focus(), Zf(c, a));
            Gj(this, a, function(a) {
                if (a = (a = Fc(a.target, "firebaseui-id-list-box-dialog-button")) && Eg(a, "listboxid")) Kj(), b(a)
            })
        }

        function yl(a, b) {
            a = (a || document).getElementsByTagName(String(Ab));
            for (var c = 0; c < a.length; c++)
                if (Eg(a[c], "listboxid") === b) return a[c];
            return null
        }

        function zl() {
            return this.o("firebaseui-id-phone-number")
        }

        function Al() {
            return this.o("firebaseui-id-phone-number-error")
        }

        function Bl() {
            return Ja(Vh, function(a) {
                return {
                    id: a.b,
                    Gb: "firebaseui-flag " +
                        Cl(a),
                    label: a.name + " " + ("\u200e+" + a.a)
                }
            })
        }

        function Cl(a) {
            return "firebaseui-flag-" + a.c
        }

        function Dl() {
            var a = this;
            xl.call(this, Bl(), function(b) {
                El.call(a, b, !0);
                a.Ba().focus()
            }, this.nb)
        }

        function El(a, b) {
            var c = Uh(a);
            if (c) {
                if (b) {
                    var d = sa(G(zl.call(this)) || "");
                    b = Wh.search(d);
                    if (b.length && b[0].a != c.a) {
                        d = "+" + c.a + d.substr(b[0].a.length + 1);
                        b = zl.call(this);
                        var e = b.type;
                        if (m(e)) switch (e.toLowerCase()) {
                            case "checkbox":
                            case "radio":
                                b.checked = d;
                                break;
                            case "select-one":
                                b.selectedIndex = -1;
                                if (n(d))
                                    for (var f = 0; e = b.options[f]; f++)
                                        if (e.value ==
                                            d) {
                                            e.selected = !0;
                                            break
                                        }
                                break;
                            case "select-multiple":
                                n(d) && (d = [d]);
                                for (f = 0; e = b.options[f]; f++)
                                    if (e.selected = !1, d)
                                        for (var g, k = 0; g = d[k]; k++) e.value == g && (e.selected = !0);
                                break;
                            default:
                                b.value = null != d ? d : ""
                        }
                    }
                }
                b = Uh(this.nb);
                this.nb = a;
                a = this.o("firebaseui-id-country-selector-flag");
                b && wg(a, Cl(b));
                vg(a, Cl(c));
                c = "\u200e+" + c.a;
                Ec(this.o("firebaseui-id-country-selector-code"), c)
            }
        }

        function Fl(a, b, c, d, e, f) {
            P.call(this, Oh, {
                Jd: c,
                lb: e || null
            }, f, "phoneSignInStart");
            this.Fd = d || null;
            this.Kd = c;
            this.l = a;
            this.I = b
        }
        t(Fl, P);
        Fl.prototype.m = function() {
            this.de(this.Fd);
            this.A(this.l, this.I);
            this.Ja();
            Fl.h.m.call(this)
        };
        Fl.prototype.f = function() {
            this.I = this.l = null;
            Fl.h.f.call(this)
        };
        Fl.prototype.Ja = function() {
            this.Kd || Tj(this, this.Ba(), this.D());
            Uj(this, this.D(), this.l);
            this.Ba().focus();
            Fg(this.Ba(), (this.Ba().value || "").length)
        };
        q(Fl.prototype, {
            Ba: zl,
            Sc: Al,
            de: function(a, b) {
                var c = this,
                    d = zl.call(this),
                    e = this.o("firebaseui-id-country-selector"),
                    f = Al.call(this);
                El.call(this, a || "1-US-0");
                Gj(this, e, function() {
                    Dl.call(c)
                });
                Cj(this,
                    d,
                    function() {
                        Ij(f) && (M(d, !0), Hj(f));
                        var a = sa(G(d) || ""),
                            b = Uh(this.nb),
                            a = Wh.search(a);
                        a.length && a[0].a != b.a && (b = a[0], El.call(c, "1" == b.a ? "1-US-0" : b.b))
                    });
                b && Dj(this, d, function() {
                    b()
                })
            },
            Td: function() {
                var a = sa(G(zl.call(this)) || ""),
                    b = Wh.search(a),
                    c = Uh(this.nb);
                b.length && b[0].a != c.a && El.call(this, b[0].b);
                b.length && (a = a.substr(b[0].a.length + 1));
                return a ? new yi(this.nb, a) : null
            },
            Ud: function() {
                return this.o("firebaseui-recaptcha-container")
            },
            qc: function() {
                return this.o("firebaseui-id-recaptcha-error")
            },
            D: Vj,
            ba: Wj,
            A: Xj
        });

        function Gl(a, b, c, d) {
            var e = b.Td();
            e ? zj ? (b.Wb("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", D("Verifying...").toString()), W(a, Sj(b, p(Ck(a).signInWithPhoneNumber, Ck(a)), [Ai(e), c], function(c) {
                var d = Q(b);
                b.Wb("firebaseui-icon-done", D("Code sent!").toString());
                var k = setTimeout(function() {
                    b.za();
                    b.i();
                    L("phoneSignInFinish", a, d, e, 15, c)
                }, 1E3);
                W(a, function() {
                    b && b.za();
                    clearTimeout(k)
                })
            }, function(a) {
                b.za();
                if (!a.name || "cancel" != a.name) {
                    grecaptcha.reset(Bj);
                    zj = null;
                    var c = a && a.message || "";
                    if (a.code) switch (a.code) {
                        case "auth/too-many-requests":
                            c = D("This phone number has been used too many times").toString();
                            break;
                        case "auth/invalid-phone-number":
                        case "auth/missing-phone-number":
                            b.Ba().focus();
                            O(b.Sc(), Qh().toString());
                            return;
                        default:
                            c = U(a)
                    }
                    b.F(c)
                }
            }))) : Aj ? O(b.qc(), D("Solve the reCAPTCHA").toString()) : !Aj && d && b.D().click() : (b.Ba().focus(), O(b.Sc(), Qh().toString()))
        }
        K.phoneSignInStart = function(a, b, c, d) {
            var e = qj(S(a)) || {};
            zj = null;
            Aj = !(e && "invisible" === e.size);
            var f = sj(S(a)),
                g = Ik(a) ? rj(S(a)) : null,
                k = new Fl(function(b) {
                    Gl(a, k, r, !(!b || !b.keyCode))
                }, function() {
                    r.clear();
                    k.i();
                    V(a, b)
                }, Aj, c && c.wb || f && f.b || null, c && c.lb || g);
            k.render(b);
            Z(a, k);
            d && k.F(d);
            e.callback = function(b) {
                k.qc() && Hj(k.qc());
                zj = b;
                Aj || Gl(a, k, r)
            };
            e["expired-callback"] = function() {
                zj = null
            };
            var r = new firebase.auth.RecaptchaVerifier(Aj ? k.Ud() : k.D(), e, Ck(a).app);
            W(a, Sj(k, p(r.render, r), [], function(a) {
                Bj = a
            }, function(c) {
                c.name && "cancel" == c.name || (c = U(c), k.i(), V(a, b, void 0, c))
            }))
        };

        function Hl(a, b, c) {
            P.call(this,
                Nh, {
                    oe: b
                }, c, "providerSignIn");
            this.cd = a
        }
        t(Hl, P);
        Hl.prototype.m = function() {
            this.ae(this.cd);
            Hl.h.m.call(this)
        };
        Hl.prototype.f = function() {
            this.cd = null;
            Hl.h.f.call(this)
        };
        q(Hl.prototype, {
            ae: function(a) {
                function b(b) {
                    a(b)
                }
                for (var c = this.mc("firebaseui-id-idp-button"), d = 0; d < c.length; d++) {
                    var e = c[d],
                        f = Eg(e, "providerId");
                    Gj(this, e, ma(b, f))
                }
            }
        });
        K.providerSignIn = function(a, b, c) {
            var d = new Hl(function(c) {
                c == firebase.auth.EmailAuthProvider.PROVIDER_ID ? (d.i(), Jk(a, b)) : c == firebase.auth.PhoneAuthProvider.PROVIDER_ID ?
                    (d.i(), L("phoneSignInStart", a, b)) : Fk(a, d, c)
            }, pj(S(a)));
            d.render(b);
            Z(a, d);
            c && d.F(c)
        };

        function Il(a, b, c, d) {
            P.call(this, wh, {
                email: c,
                Hd: !!b
            }, d, "signIn");
            this.yc = a;
            this.I = b
        }
        t(Il, P);
        Il.prototype.m = function() {
            this.Ea(this.yc);
            this.A(this.yc, this.I || void 0);
            this.Ja();
            Il.h.m.call(this)
        };
        Il.prototype.f = function() {
            this.I = this.yc = null;
            Il.h.f.call(this)
        };
        Il.prototype.Ja = function() {
            this.w().focus();
            Fg(this.w(), (this.w().value || "").length)
        };
        q(Il.prototype, {
            w: dk,
            Qa: ek,
            Ea: fk,
            J: gk,
            ma: hk,
            D: Vj,
            ba: Wj,
            A: Xj
        });
        K.signIn =
            function(a, b, c, d) {
                var e = Hk(a) && yj(S(a)) != ej,
                    f = new Il(function() {
                        var b = f,
                            c = b.ma() || "";
                        c && Kk(a, b, c)
                    }, e ? null : function() {
                        f.i();
                        V(a, b, c)
                    }, c);
                f.render(b);
                Z(a, f);
                d && f.F(d)
            };

        function Jl(a, b) {
            this.Mc = !1;
            var c = Kl(b);
            if (Ll[c]) throw Error('An AuthUI instance already exists for the key "' + c + '"');
            Ll[c] = this;
            this.wa = a;
            this.fd = null;
            Ml(this.wa);
            this.Va = firebase.initializeApp({
                apiKey: a.app.options.apiKey,
                authDomain: a.app.options.authDomain
            }, a.app.name + "-firebaseui-temp").auth();
            Ml(this.Va);
            this.Va.setPersistence &&
                this.Va.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            this.zd = b;
            this.g = new dj;
            this.xb = this.Zb = this.Ab = this.Hc = null;
            this.sa = []
        }

        function Ml(a) {
            a && a.INTERNAL && a.INTERNAL.logFramework && a.INTERNAL.logFramework("FirebaseUI-web")
        }
        var Ll = {};

        function Kl(a) {
            return a || "[DEFAULT]"
        }
        Jl.prototype.getRedirectResult = function() {
            Y(this);
            this.Ab || (this.Ab = pe(X(this).getRedirectResult()));
            return this.Ab
        };

        function Z(a, b) {
            Y(a);
            a.xb = b
        }
        var Nl = null;

        function Lk() {
            return Nl
        }

        function X(a) {
            Y(a);
            return a.Va
        }

        function Ck(a) {
            Y(a);
            return a.wa
        }

        function T(a) {
            Y(a);
            return a.zd
        }
        h = Jl.prototype;
        h.start = function(a, b) {
            Y(this);
            var c = this;
            "undefined" !== typeof this.wa.languageCode && (this.fd = this.wa.languageCode);
            var d = "en".replace(/_/g, "-");
            this.wa.languageCode = d;
            this.Va.languageCode = d;
            this.Vb(b);
            "complete" == l.document.readyState ? Ol(this, a) : bf(window, "load", function() {
                Ol(c, a)
            })
        };

        function Ol(a, b) {
            var c = fi(b);
            c.setAttribute("lang", "en".replace(/_/g, "-"));
            if (Nl) {
                var d = Nl;
                Y(d);
                cj(T(d)) && Df && Df.log(yf, "UI Widget is already rendered on the page and is pending some user interaction. Only one widget instance can be rendered per page. The previous instance has been automatically reset.",
                    void 0);
                Nl.reset()
            }
            Nl = a;
            a.Zb = c;
            Pl(a, c);
            ah(new bh) && ah(new ch) ? Qk(a, b) : (b = fi(b), c = new pk(D("The browser you are using does not support Web Storage. Please try again in a different browser.").toString()), c.render(b), Z(a, c))
        }

        function W(a, b) {
            Y(a);
            if (b) {
                a.sa.push(b);
                var c = function() {
                    Qa(a.sa, function(a) {
                        return a == b
                    })
                };
                "function" != typeof b && b.then(c, c)
            }
        }
        h.reset = function() {
            Y(this);
            this.Zb && this.Zb.removeAttribute("lang");
            "undefined" !== typeof this.wa.languageCode && (this.wa.languageCode = this.fd);
            this.Ab = pe({
                user: null,
                credential: null
            });
            Nl == this && (Nl = null);
            this.Zb = null;
            for (var a = 0; a < this.sa.length; a++)
                if ("function" == typeof this.sa[a]) this.sa[a]();
                else this.sa[a].cancel && this.sa[a].cancel();
            this.sa = [];
            Xi(Si, T(this));
            this.xb && (this.xb.i(), this.xb = null);
            this.yb = null
        };

        function Pl(a, b) {
            a.yb = null;
            a.Hc = new ri(b);
            a.Hc.register();
            Ve(a.Hc, "pageEnter", function(b) {
                b = b && b.Ye;
                if (a.yb != b) {
                    var d;
                    d = S(a);
                    (d = xj(d).uiChanged || null) && d(a.yb, b);
                    a.yb = b
                }
            })
        }
        h.Vb = function(a) {
            Y(this);
            this.g.Vb(a)
        };

        function S(a) {
            Y(a);
            return a.g
        }
        h.xe = function() {
            Y(this);
            var a, b = S(this),
                c = li(b.g, "widgetUrl");
            a = lj(b, c);
            if (S(this).g.get("popupMode")) {
                var b = (window.screen.availHeight - 600) / 2,
                    c = (window.screen.availWidth - 500) / 2,
                    d = a || "about:blank",
                    b = {
                        width: 500,
                        height: 600,
                        top: 0 < b ? b : 0,
                        left: 0 < c ? c : 0,
                        location: !0,
                        resizable: !0,
                        statusbar: !0,
                        toolbar: !1
                    };
                b.target = b.target || d.target || "google_popup";
                b.width = b.width || 690;
                b.height = b.height || 500;
                var e;
                (c = b) || (c = {});
                b = window;
                a = d instanceof hc ? d : lc("undefined" != typeof d.href ? d.href : String(d));
                var d = c.target || d.target,
                    f = [];
                for (e in c) switch (e) {
                    case "width":
                    case "height":
                    case "top":
                    case "left":
                        f.push(e +
                            "=" + c[e]);
                        break;
                    case "target":
                    case "noreferrer":
                        break;
                    default:
                        f.push(e + "=" + (c[e] ? 1 : 0))
                }
                e = f.join(",");
                (u("iPhone") && !u("iPod") && !u("iPad") || u("iPad") || u("iPod")) && b.navigator && b.navigator.standalone && d && "_self" != d ? (e = b.document.createElement(String(vb)), a = a instanceof hc ? a : lc(a), e.href = jc(a), e.setAttribute("target", d), c.noreferrer && e.setAttribute("rel", "noreferrer"), c = document.createEvent("MouseEvent"), c.initMouseEvent("click", !0, !0, b, 1), e.dispatchEvent(c), e = {}) : c.noreferrer ? (e = b.open("", d, e), b = jc(a),
                    e && (ib && -1 != b.indexOf(";") && (b = "'" + b.replace(/'/g, "%27") + "'"), e.opener = null, dc("b/12014412, meta tag with sanitized URL"), b = '<META HTTP-EQUIV="refresh" content="0; url=' + ta(b) + '">', e.document.write(pc((new nc).ee(b))), e.document.close())) : e = b.open(jc(a), d, e);
                e && e.focus()
            } else window.location.assign(a)
        };

        function Y(a) {
            if (a.Mc) throw Error("AuthUI instance is deleted!");
        }
        h.delete = function() {
            var a = this;
            Y(this);
            return this.Va.app.delete().then(function() {
                var b = Kl(T(a));
                delete Ll[b];
                a.reset();
                a.Mc = !0
            })
        };
        oa("firebaseui.auth.AuthUI", Jl);
        oa("firebaseui.auth.AuthUI.getInstance", function(a) {
            a = Kl(a);
            return Ll[a] ? Ll[a] : null
        });
        oa("firebaseui.auth.AuthUI.prototype.start", Jl.prototype.start);
        oa("firebaseui.auth.AuthUI.prototype.setConfig", Jl.prototype.Vb);
        oa("firebaseui.auth.AuthUI.prototype.signIn", Jl.prototype.xe);
        oa("firebaseui.auth.AuthUI.prototype.reset", Jl.prototype.reset);
        oa("firebaseui.auth.AuthUI.prototype.delete", Jl.prototype.delete);
        oa("firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM", ej);
        oa("firebaseui.auth.CredentialHelper.NONE", "none")
    })();
})();