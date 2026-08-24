/**
 * Utility for dependency graph operations and cycle detection using DFS.
 */

export interface TaskEdge {
  predecessorTaskId: string;
  dependentTaskId: string;
}

export class DependencyGraphUtil {
  /**
   * Checks if adding a new dependency (predecessorId -> dependentId) would create a cycle.
   *
   * @param existingEdges List of existing dependencies [from: predecessor, to: dependent]
   * @param newPredecessorId The predecessor task ID to add
   * @param newDependentId The dependent task ID to add
   * @returns boolean true if a cycle is detected, false if safe
   */
  static wouldCreateCycle(
    existingEdges: TaskEdge[],
    newPredecessorId: string,
    newDependentId: string,
  ): boolean {
    // Direct self-dependency
    if (newPredecessorId === newDependentId) {
      return true;
    }

    // Build adjacency list: node -> array of nodes that depend on it
    const adj = new Map<string, string[]>();

    const addEdge = (u: string, v: string) => {
      if (!adj.has(u)) {
        adj.set(u, []);
      }
      adj.get(u)!.push(v);
    };

    for (const edge of existingEdges) {
      // Don't duplicate if already exists
      if (
        edge.predecessorTaskId === newPredecessorId &&
        edge.dependentTaskId === newDependentId
      ) {
        return false;
      }
      addEdge(edge.predecessorTaskId, edge.dependentTaskId);
    }

    // Add proposed edge
    addEdge(newPredecessorId, newDependentId);

    // If there is a path from newDependentId back to newPredecessorId, then adding
    // newPredecessorId -> newDependentId creates a cycle!
    return this.hasPath(adj, newDependentId, newPredecessorId);
  }

  /**
   * Performs DFS to check if there is a directed path from startNode to targetNode.
   */
  static hasPath(
    adj: Map<string, string[]>,
    startNode: string,
    targetNode: string,
    visited: Set<string> = new Set(),
  ): boolean {
    if (startNode === targetNode) {
      return true;
    }

    visited.add(startNode);
    const neighbors = adj.get(startNode) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.hasPath(adj, neighbor, targetNode, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Evaluates if all predecessor tasks for a given task are completed (status === 'DONE').
   */
  static areAllPredecessorsDone(
    predecessors: { status: string }[],
  ): boolean {
    if (!predecessors || predecessors.length === 0) {
      return true;
    }
    return predecessors.every((p) => p.status === 'DONE');
  }
}
