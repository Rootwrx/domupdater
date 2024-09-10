class DomUpdater {
    update(parentElement, markup, { update = null, ignore = [] } = {}) {
        if (!(parentElement instanceof Element)) {
            throw new Error("parentElement must be a valid DOM element");
        }

        // Add this condition to compare text content
        if (parentElement.textContent.trim() === markup.trim()) {
            console.log("Content is identical, skipping update");
            return;
        }

        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = markup.trim();
        const updatedNodes = new Set();

        if (update) {
            this._updateSelectedElements(
                parentElement,
                tempContainer,
                update,
                ignore,
                updatedNodes
            );
        } else {
            this._updateChildNodes(
                parentElement,
                tempContainer,
                ignore,
                updatedNodes
            );
        }
    }
    _updateSelectedElements(
        currentElement,
        newElement,
        selectors,
        ignoreSelectors,
        updatedNodes
    ) {
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];

        selectorList.forEach((selector) => {
            const currentNodes = currentElement.querySelectorAll(selector);
            const newNodes = newElement.querySelectorAll(selector);

            currentNodes.forEach((currentNode, index) => {
                if (index < newNodes.length) {
                    this._updateNode(
                        currentNode,
                        newNodes[index],
                        ignoreSelectors,
                        updatedNodes
                    );
                } else {
                    currentNode.remove();
                    console.log(`Removed element matching selector: ${selector}`);
                }
            });

            if (newNodes.length > currentNodes.length) {
                for (let i = currentNodes.length; i < newNodes.length; i++) {
                    const parentInCurrent = this._findParentInCurrent(
                        currentElement,
                        newNodes[i],
                        selector
                    );
                    if (parentInCurrent) {
                        parentInCurrent.appendChild(newNodes[i].cloneNode(true));
                        console.log(`Added new element matching selector: ${selector}`);
                    }
                }
            }
        });

        // Update remaining nodes that weren't updated by selectors
        this._updateChildNodes(
            currentElement,
            newElement,
            ignoreSelectors,
            updatedNodes
        );
    }

    _findParentInCurrent(currentElement, newNode, selector) {
        const newParent = newNode.parentElement;
        if (!newParent) return currentElement;

        const parentSelector = this._getUniqueSelector(newParent);
        return currentElement.querySelector(parentSelector) || currentElement;
    }

    _getUniqueSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(" ").join(".")}`;
        return element.tagName.toLowerCase();
    }

    _updateNode(currentNode, newNode, ignoreSelectors, updatedNodes) {
        if (!currentNode || !newNode || updatedNodes.has(currentNode)) return;

        if (this._shouldIgnore(currentNode, ignoreSelectors)) {
            console.log(`Ignored node: ${currentNode.nodeName}`);
            return;
        }

        updatedNodes.add(currentNode);

        if (
            currentNode.nodeType !== newNode.nodeType ||
            currentNode.nodeName !== newNode.nodeName
        ) {
            currentNode.parentNode.replaceChild(newNode.cloneNode(true), currentNode);
            console.log(
                `Replaced node: ${currentNode.nodeName} with ${newNode.nodeName}`
            );
            return;
        }

        switch (currentNode.nodeType) {
            case Node.ELEMENT_NODE:
                this._updateElementNode(
                    currentNode,
                    newNode,
                    ignoreSelectors,
                    updatedNodes
                );
                break;
            case Node.TEXT_NODE:
                this._updateTextNode(currentNode, newNode);
                break;
            case Node.COMMENT_NODE:
                this._updateCommentNode(currentNode, newNode);
                break;
        }
    }

    _updateElementNode(
        currentElement,
        newElement,
        ignoreSelectors,
        updatedNodes
    ) {
        this._updateAttributes(currentElement, newElement);
        this._updateChildNodes(
            currentElement,
            newElement,
            ignoreSelectors,
            updatedNodes
        );
    }

    _updateAttributes(currentElement, newElement) {
        const currentAttrs = Array.from(currentElement.attributes);
        const newAttrs = Array.from(newElement.attributes);

        currentAttrs.forEach((attr) => {
            if (!newElement.hasAttribute(attr.name)) {
                currentElement.removeAttribute(attr.name);
                console.log(`Removed attribute: ${attr.name}`);
            }
        });

        newAttrs.forEach((attr) => {
            if (
                !currentElement.hasAttribute(attr.name) ||
                currentElement.getAttribute(attr.name) !== attr.value
            ) {
                currentElement.setAttribute(attr.name, attr.value);
                console.log(`Updated attribute: ${attr.name} = ${attr.value}`);
            }
        });
    }

    _updateChildNodes(currentElement, newElement, ignoreSelectors, updatedNodes) {
        const currentChildNodes = Array.from(currentElement.childNodes);
        const newChildNodes = Array.from(newElement.childNodes);

        let currentIndex = 0;
        let newIndex = 0;

        while (
            currentIndex < currentChildNodes.length ||
            newIndex < newChildNodes.length
        ) {
            const currentChild = currentChildNodes[currentIndex];
            const newChild = newChildNodes[newIndex];

            if (this._isEmptyTextNode(currentChild)) {
                currentIndex++;
                continue;
            }
            if (this._isEmptyTextNode(newChild)) {
                newIndex++;
                continue;
            }

            if (!newChild) {
                currentElement.removeChild(currentChild);
                console.log(`Removed child node: ${currentChild.nodeName}`);
                currentIndex++;
            } else if (!currentChild) {
                currentElement.appendChild(newChild.cloneNode(true));
                console.log(`Added child node: ${newChild.nodeName}`);
                newIndex++;
            } else {
                this._updateNode(currentChild, newChild, ignoreSelectors, updatedNodes);
                currentIndex++;
                newIndex++;
            }
        }
    }

    _isEmptyTextNode(node) {
        return (
            node && node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ""
        );
    }

    _updateTextNode(currentNode, newNode) {
        if (currentNode.textContent !== newNode.textContent) {
            currentNode.textContent = newNode.textContent;
            console.log(`Updated text node: ${newNode.textContent}`);
        }
    }

    _updateCommentNode(currentNode, newNode) {
        if (currentNode.data !== newNode.data) {
            currentNode.data = newNode.data;
            console.log(`Updated comment node: ${newNode.data}`);
        }
    }

    _shouldIgnore(node, ignoreSelectors) {
        return ignoreSelectors.some(
            (selector) =>
            (node.matches && node.matches(selector)) ||
            (node.closest && node.closest(selector))
        );
    }
}

export default new DomUpdater();
