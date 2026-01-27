import type { ReactElement } from "react";

export interface RouteConfig {
  path: string;
  element: ReactElement;
  children?: RouteConfig[];
}

export type LazyComponent<T = Record<string, unknown>> = React.LazyExoticComponent<
  React.ComponentType<T>
>;
