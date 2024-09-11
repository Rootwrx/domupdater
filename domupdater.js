class DOMUpdater {
    constructor() {
        this.parser = new DOMParser();
    }

    update(element, newMarkup, options = {}) {
        const { update = [], ignore = [] } = options;
        const originalAttributes = this.getAttributes(element);
        const newDoc = this.parser.parseFromString(
            `<div>${newMarkup}</div>`,
            "text/html"
        );
        const newElement = newDoc.body.firstElementChild;

        const isParentIncluded =
        newElement.children.length === 1 &&
        newElement.firstElementChild.tagName === element.tagName;

        if (isParentIncluded) {
            this.updateElementAndChildren(
                element,
                newElement.firstElementChild,
                update,
                ignore
            );
        } else {
            this.updateChildren(element, newElement, update, ignore);
        }

        this.preserveAttributes(
            element,
            originalAttributes,
            isParentIncluded ? newElement.firstElementChild : null
        );
    }

    updateElementAndChildren(oldElement, newElement, update, ignore) {
        if (!this.shouldIgnore(oldElement, ignore)) {
            this.updateAttributes(oldElement, newElement);
        }
        this.updateChildren(oldElement, newElement, update, ignore);
    }

    updateAttributes(oldElement, newElement) {
        const oldAttributes = Array.from(oldElement.attributes);
        const newAttributes = Array.from(newElement.attributes);

        // Remove attributes not present in the new element
        oldAttributes.forEach((attr) => {
            if (!newElement.hasAttribute(attr.name)) {
                oldElement.removeAttribute(attr.name);
            }
        });

        // Add or update attributes from the new element
        newAttributes.forEach((attr) => {
            if (oldElement.getAttribute(attr.name) !== attr.value) {
                oldElement.setAttribute(attr.name, attr.value);
            }
        });
    }

    updateChildren(oldElement, newElement, update, ignore) {
        const oldChildren = Array.from(oldElement.childNodes);
        const newChildren = Array.from(newElement.childNodes);

        let oldIndex = 0;
        let newIndex = 0;

        while (oldIndex < oldChildren.length || newIndex < newChildren.length) {
            const oldChild = oldChildren[oldIndex];
            const newChild = newChildren[newIndex];

            if (!oldChild) {
                // Add new child
                if (!this.shouldIgnore(newChild, ignore)) {
                    oldElement.appendChild(this.cloneNode(newChild));
                }
                newIndex++;
            } else if (!newChild) {
                // Remove old child
                if (!this.shouldIgnore(oldChild, ignore)) {
                    if (oldChild.parentNode === oldElement) {
                        oldElement.removeChild(oldChild);
                    } else {
                        oldIndex++;
                    }
                } else {
                    oldIndex++;
                }
            } else if (this.isSameNode(oldChild, newChild)) {
                // Update existing child
                this.updateChild(oldChild, newChild, oldElement, update, ignore);
                oldIndex++;
                newIndex++;
            } else {
                // Nodes are different
                if (this.shouldIgnore(oldChild, ignore)) {
                    oldIndex++;
                } else if (this.shouldIgnore(newChild, ignore)) {
                    newIndex++;
                } else {
                    if (oldChild.parentNode === oldElement) {
                        oldElement.insertBefore(this.cloneNode(newChild), oldChild);
                    } else {
                        oldElement.appendChild(this.cloneNode(newChild));
                    }
                    newIndex++;
                }
            }
        }
    }

    isSameNode(node1, node2) {
        return (
            node1.nodeType === node2.nodeType && node1.nodeName === node2.nodeName
        );
    }

    updateChild(oldChild, newChild, parentElement, update, ignore) {
        if (this.shouldIgnore(oldChild, ignore)) {
            return;
        }

        if (this.shouldUpdate(oldChild, update)) {
            if (oldChild.nodeType === Node.TEXT_NODE) {
                if (oldChild.nodeValue !== newChild.nodeValue) {
                    oldChild.nodeValue = newChild.nodeValue;
                }
            } else if (oldChild.nodeType === Node.ELEMENT_NODE) {
                this.updateAttributes(oldChild, newChild);
                this.updateChildren(oldChild, newChild, update, ignore);
            }
        }
    }

    preserveAttributes(element, originalAttributes, newParentElement) {
        const attributesToPreserve = newParentElement
        ? this.mergeAttributes(
            originalAttributes,
            this.getAttributes(newParentElement)
        )
        : originalAttributes;

        Object.entries(attributesToPreserve).forEach(([name, value]) => {
            if (element.getAttribute(name) !== value) {
                element.setAttribute(name, value);
            }
        });
    }

    getAttributes(element) {
        const attributes = {};
        Array.from(element.attributes).forEach((attr) => {
            attributes[attr.name] = attr.value;
        });
        return attributes;
    }

    mergeAttributes(original, updated) {
        return { ...original, ...updated };
    }

    shouldIgnore(element, ignore) {
        return (
            element &&
            element.nodeType === Node.ELEMENT_NODE &&
            ignore.some((selector) => element.matches(selector))
        );
    }

    shouldUpdate(element, update) {
        return (
            update.length === 0 ||
            (element &&
            element.nodeType === Node.ELEMENT_NODE &&
            update.some((selector) => element.matches(selector)))
        );
    }

    cloneNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.nodeValue);
        }
        const clone = node.cloneNode(false);
        for (const child of node.childNodes) {
            clone.appendChild(this.cloneNode(child));
        }
        return clone;
    }
}


export default new DOMUpdater()
