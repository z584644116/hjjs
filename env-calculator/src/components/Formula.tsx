'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormulaProps {
  /** LaTeX 源字符串。 */
  tex: string;
  /** 默认块级渲染;行内公式传 false。 */
  displayMode?: boolean;
  className?: string;
}

/**
 * 使用 KaTeX 渲染数学公式。字体文件随 `katex.min.css` 一并加载。
 * 解析失败不抛异常,交给 KaTeX 的内部红色错误显示,避免打断界面。
 */
export default function Formula({ tex, displayMode = true, className }: FormulaProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    katex.render(tex, ref.current, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
    });
  }, [tex, displayMode]);

  return <div ref={ref} className={className} aria-label={`公式:${tex}`} />;
}
