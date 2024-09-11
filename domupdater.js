class DOMUpdater {
    constructor() {
        this.parser = new DOMParser();
    }

    update(element, newMarkup, options = {}) {
        const { update = [], ignore = [] } = options;
        const oldMarkup = element.outerHTML;
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

        this.preserveParentAttributes(element, element);
    }

    updateElementAndChildren(oldElement, newElement, update, ignore) {
        if (!this.shouldIgnore(oldElement, ignore)) {
            this.updateAttributes(oldElement, newElement);
        }
        this.updateChildren(oldElement, newElement, update, ignore);
    }

    updateAttributes(oldElement, newElement) {
        // Remove attributes not present in the new element
        for (let i = oldElement.attributes.length - 1; i >= 0; i--) {
            const attr = oldElement.attributes[i];
            if (
                !newElement.hasAttribute(attr.name) &&
                !attr.name.startsWith("data-")
            ) {
                oldElement.removeAttribute(attr.name);
            }
        }

        // Add or update attributes from the new element
        for (const attr of newElement.attributes) {
            if (oldElement.getAttribute(attr.name) !== attr.value) {
                oldElement.setAttribute(attr.name, attr.value);
            }
        }
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
                    oldElement.removeChild(oldChild);
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
                    oldElement.insertBefore(this.cloneNode(newChild), oldChild);
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

    preserveParentAttributes(element, originalElement) {
        // Preserve all attributes
        for (const attr of originalElement.attributes) {
            if (
                !element.hasAttribute(attr.name) ||
                element.getAttribute(attr.name) !== attr.value
            ) {
                element.setAttribute(attr.name, attr.value);
            }
        }
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


export default new DOMUpdater();
