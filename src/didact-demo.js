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
 * 将元素渲染到 DOM 中
 * @param {Object} element - 虚拟 DOM 元素对象
 * @param {HTMLElement} container - 要挂载的实际 DOM 容器
 */
function render(element, container) {
  // 循环创建 文本或元素节点的代表 dom 对象树
  const dom =
    element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  // 过滤掉 children 属性，其他属性赋值给 dom
  const isProperty = (key) => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  // 递归地渲染子元素
  element.props.children.forEach((child) => render(child, dom));

  // 将渲染后的元素附加到容器
  container.appendChild(dom);
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
