import React, { FC, SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  stroke?: string;
}

export const I: Record<string, FC<IconProps>> = {};

const mk = (name: string, paths: React.ReactNode) => {
  I[name] = ({ size = 18, stroke = "1.6", ...rest }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      stroke="currentColor" 
      strokeWidth={stroke}
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...rest}
    >
      {paths}
    </svg>
  );
};

mk("home", <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>);
mk("dice", <><rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/></>);
mk("d20", <><path d="M12 3l8.5 5v8L12 21 3.5 16V8z"/><path d="M12 3v18M3.5 8L20.5 16M20.5 8L3.5 16M12 3l-4.5 8h9zM12 21l-4.5-8h9z"/></>);
mk("sword", <><path d="M14.5 6.5L18 3l3 3-3.5 3.5"/><path d="M14.5 6.5L4 17l3 3L17.5 9.5"/><path d="M5 18l1.5 1.5"/></>);
mk("shield", <><path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></>);
mk("scroll", <><path d="M4 6c0-1.5 1-2 2.5-2H17a2 2 0 012 2v11"/><path d="M19 17H8a2 2 0 100 4h11"/><path d="M8 8h8M8 12h6"/></>);
mk("book", <><path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z"/><path d="M5 18a2 2 0 012-2h11"/></>);
mk("crown", <><path d="M3 7l3 6 3-7 3 5 3-5 3 7 3-6v11H3z"/><path d="M3 18h18"/></>);
mk("flame", <><path d="M12 3c0 4 5 5 5 10a5 5 0 11-10 0c0-3 2-4 2-7 0 2 3 2 3-3z"/></>);
mk("eye",   <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
mk("eyeOff",<><path d="M2 12s3.5-7 10-7c2.5 0 4.6 1 6.3 2.3"/><path d="M22 12s-3.5 7-10 7c-2 0-3.8-.6-5.3-1.6"/><path d="M3 3l18 18"/><circle cx="12" cy="12" r="3"/></>);
mk("lock",  <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></>);
mk("user",  <><circle cx="12" cy="8" r="4"/><path d="M3 21c1-4.5 5-7 9-7s8 2.5 9 7"/></>);
mk("users", <><circle cx="9" cy="8" r="3.5"/><path d="M2 21c.7-3.5 3.5-6 7-6s6.3 2.5 7 6"/><path d="M17 11a3.5 3.5 0 100-7"/><path d="M22 21c-.4-2-1.5-3.5-3-4.5"/></>);
mk("plus",  <><path d="M12 5v14M5 12h14"/></>);
mk("minus", <><path d="M5 12h14"/></>);
mk("x",     <><path d="M6 6l12 12M18 6L6 18"/></>);
mk("check", <><path d="M5 13l4 4 10-10"/></>);
mk("chevR", <><path d="M9 6l6 6-6 6"/></>);
mk("chevL", <><path d="M15 6l-6 6 6 6"/></>);
mk("chevD", <><path d="M6 9l6 6 6-6"/></>);
mk("arrowR",<><path d="M5 12h14M13 6l6 6-6 6"/></>);
mk("search",<><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>);
mk("cog",   <><circle cx="12" cy="12" r="3"/><path d="M19 12c0-.5 0-1-.2-1.5l2-1.5-2-3.5-2.4 1c-.7-.5-1.5-1-2.4-1.2L13.5 3h-3l-.5 2.3c-.9.3-1.7.7-2.4 1.2l-2.4-1-2 3.5 2 1.5c-.2.5-.2 1-.2 1.5s0 1 .2 1.5l-2 1.5 2 3.5 2.4-1c.7.5 1.5 1 2.4 1.2L10.5 21h3l.5-2.3c.9-.3 1.7-.7 2.4-1.2l2.4 1 2-3.5-2-1.5c.2-.5.2-1 .2-1.5z"/></>);
mk("bell",  <><path d="M5 16V11a7 7 0 1114 0v5l2 2H3z"/><path d="M10 21a2 2 0 004 0"/></>);
mk("logout",<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>);
mk("login", <><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></>);
mk("heart", <><path d="M12 20s-7-4.5-9-9C1.5 7 4 4 7 4c1.7 0 3.5 1 5 3 1.5-2 3.3-3 5-3 3 0 5.5 3 4 7-2 4.5-9 9-9 9z"/></>);
mk("skull", <><path d="M12 3a8 8 0 00-8 8v3l2 2v3h3v-2h6v2h3v-3l2-2v-3a8 8 0 00-8-8z"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><path d="M11 16h2"/></>);
mk("sparkles",<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="2"/></>);
mk("wand",  <><path d="M4 20L17 7M14 4l2 2M20 10l-2-2M19 4l1 1M13 11l3 3"/></>);
mk("map",   <><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>);
mk("compass",<><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5L13 13l-3.5 1.5L11 11z"/></>);
mk("zap",   <><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>);
mk("filter",<><path d="M3 5h18l-7 9v7l-4-2v-5z"/></>);
mk("kebab", <><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></>);
mk("play",  <><path d="M6 4l14 8-14 8z"/></>);
mk("pause", <><path d="M7 4h3v16H7zM14 4h3v16h-3z"/></>);
mk("mic",   <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>);
mk("micOff",<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M3 3l18 18"/><path d="M5 11a7 7 0 0014 0"/></>);
mk("volume",<><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9a4 4 0 010 6M18 6a8 8 0 010 12"/></>);
mk("send",  <><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></>);
mk("link",  <><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></>);
mk("copy",  <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>);
mk("info",  <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></>);
mk("alert", <><path d="M12 3l10 17H2z"/><path d="M12 10v4M12 17v.5"/></>);
mk("bag",   <><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></>);
mk("potion",<><path d="M9 3h6v3l2 3v9a2 2 0 01-2 2H9a2 2 0 01-2-2V9l2-3z"/><path d="M7 13h10"/></>);
mk("torch", <><path d="M10 3c-1 3 3 4 2 7-1 2-3 2-3 5h6c0-3-2-3-3-5-1-3 3-4 2-7z"/><path d="M10 18v3M12 18v3M14 18v3"/></>);
mk("layers",<><path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/></>);
mk("hex",   <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/></>);
mk("globe", <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>);
mk("history",<><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></>);

export const Icon = (name: string, props: IconProps = {}) => {
  const C = I[name];
  return C ? <C {...props} /> : null;
};
