/**
 * adapters/adapterInterface.ts — Re-exports the GraphAdapter interface and
 * provides the adapter registry used by the UI to offer data source options.
 *
 * Why a separate file? The interface is defined in types/graph.ts (where all types live),
 * but this file is the central place to register all available adapters so the
 * Header component can offer them as selectable options without importing
 * each adapter file directly.
 */

export type { GraphAdapter } from '../types/graph';
