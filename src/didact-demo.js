/**
 * 创建一个元素对象
 * @param {string} type - 元素的类型，如 'div', 'h1'
 * @param {Object} [props] - 元素的属性，如 { style: "background: salmon" }
 * @param {...(Object|string)} children - 子元素，可以是其他元素或文本
 * @returns {Object} - 返回一个虚拟 DOM 元素对象
 */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

/**
 * 创建一个文本元素对象
 * @param {string} text - 文本内容
 * @returns {Object} - 返回一个虚拟文本元素对象
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      // 对于文本节点，nodeValue 包含该节点的文本内容。
      nodeValue: text,
      children: [], // 文本节点没有子元素
    },
  };
}

/**
 * 创建一个真实的 DOM 节点
 * @param {Object} fiber - Fiber 节点
 * @returns {HTMLElement | Text} - 返回创建的 DOM 节点
 */
function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  const isProperty = (key) => key !== "children";
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

/**
 * 将元素渲染到 DOM 中
 * @param {Object} element - 虚拟 DOM 元素对象
 * @param {HTMLElement} container - 要挂载的实际 DOM 容器
 */
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };
}

let nextUnitOfWork = null;

/**
 * 工作循环函数，在空闲时间执行工作单元
 * @param {IdleDeadline} deadline - 当前帧的空闲时间信息
 */
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

/**
 * 执行一个工作单元
 * @param {Object} fiber - 当前的 Fiber 节点
 * @returns {Object | null} - 返回下一个要处理的工作单元
 */
function performUnitOfWork(fiber) {
  // 创建 DOM 节点
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // 将 DOM 节点添加到父节点
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

  // 创建 Fiber 子节点
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // 返回下一个工作单元
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

// 自定义的 Didact 对象，包含 createElement 和 render 方法
const Didact = { createElement, render };

/** @jsx Didact.createElement */
// 创建一个虚拟 DOM 元素
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);
// const element = Didact.createElement(
//   "div",
//   { style: "background: salmon" },
//   Didact.createElement("h1", null, "Hello World"),
//   Didact.createElement("h2", { style: "text-align:right" }, "from Didact")
// );

// 获取要挂载的 DOM 容器
const container = document.getElementById("didact-root");

// 使用 Didact 的 render 方法将虚拟 DOM 渲染到实际的 DOM 中
Didact.render(element, container);
