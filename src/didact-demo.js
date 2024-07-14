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

  updateDom(dom, {}, fiber.props);

  return dom;
}

// 辅助函数，判断属性类型
const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

/**
 * 更新 DOM 节点属性
 * @param {HTMLElement | Text} dom - DOM 节点
 * @param {Object} prevProps - 之前的属性
 * @param {Object} nextProps - 新的属性
 */
function updateDom(dom, prevProps, nextProps) {
  // 移除旧的或更改的事件监听器
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 移除旧的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });

  // 设置新的或更改的属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // 添加事件监听器
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}
/**
 * 提交fiber 树的根节点、让 commitWork 递归地将 fiber 树中的每一个节点附加到实际的 DOM 中
 */
function commitRoot() {
  // deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  // 提交完成后清空工作根节点
  wipRoot = null;
}

/**
 * 递归地将 fiber 树中的每一个节点附加到实际的 DOM 中
 * @param {Object} fiber - 当前的 fiber 节点
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  // domParent.appendChild(fiber.dom);
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * 将元素渲染到 DOM 中
 * @param {Object} element - 虚拟 DOM 元素对象
 * @param {HTMLElement} container - 要挂载的实际 DOM 容器
 */
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null; // 下一个要处理的工作单元、既下一个要处理的 虚拟 Dom 节点
let currentRoot = null;
let wipRoot = null; // fiber 树的根节点
let deletions = null;

/**
 * 工作循环函数，在空闲时间执行工作单元
 * @param {IdleDeadline} deadline - 当前帧的空闲时间信息
 */
function workLoop(deadline) {
  let shouldYield = false;

  // 当还有工作单元且不需要让出控制权时，继续执行工作单元
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 如果剩余时间少于1毫秒，则让出控制权
  }

  // 当没有下一个工作单元且有工作根节点时，提交根节点fiber、将fiber 转换成真实 Dom
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
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

  // 创建 Fiber 子节点
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

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

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    const sameType = oldFiber && element && element.type == oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

// 自定义的 Didact 对象，包含 createElement 和 render 方法
const Didact = { createElement, render };

// const element = Didact.createElement(
//   "div",
//   { style: "background: salmon" },
//   Didact.createElement("h1", null, "Hello World"),
//   Didact.createElement("h2", { style: "text-align:right" }, "from Didact")
// );

const updateValue = (e) => {
  rerender(e.target.value);
};

const rerender = (value) => {
  /** @jsx Didact.createElement */
  // 创建一个虚拟 DOM 元素
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <div>请输入</div>
      <h2>Hello {value}</h2>
    </div>
  );
  // 获取要挂载的 DOM 容器
  const container = document.getElementById("didact-root");

  // 使用 Didact 的 render 方法将虚拟 DOM 渲染到实际的 DOM 中
  Didact.render(element, container);
};

rerender();
