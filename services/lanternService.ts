
import { LanternGraph, LanternNode, LanternEdge, LanternNodeType, Emotion } from '../types';

const LANTERN_KEY = 'chronos_lantern_graph';
const MAX_NODES = 200; // Cap for browser performance
const DECAY_RATE = 0.05; // Weight lost per day
const SAVE_DEBOUNCE_MS = 2000; // Wait 2s before writing to disk

/**
 * Lantern Service: The Proprioceptive Memory Core.
 * Manages the hypergraph of concepts, emotions, and inputs.
 */
class LanternService {
  private graph: LanternGraph;
  private saveTimeout: number | null = null;

  constructor() {
    this.graph = this.loadGraph();
  }

  private loadGraph(): LanternGraph {
    try {
      const stored = localStorage.getItem(LANTERN_KEY);
      return stored ? JSON.parse(stored) : { nodes: {}, edges: [] };
    } catch (e) {
      console.warn("Lantern: Failed to load graph, initializing empty.", e);
      return { nodes: {}, edges: [] };
    }
  }

  private saveGraph() {
    // Basic pruning if too large
    const nodeKeys = Object.keys(this.graph.nodes);
    if (nodeKeys.length > MAX_NODES) {
        // Remove oldest non-emotional nodes
        const sorted = nodeKeys.sort((a, b) => this.graph.nodes[a].timestamp - this.graph.nodes[b].timestamp);
        const toRemove = sorted.slice(0, nodeKeys.length - MAX_NODES);
        toRemove.forEach(id => {
            if (this.graph.nodes[id].type !== 'emotion') delete this.graph.nodes[id];
        });
        // Cleanup orphaned edges
        this.graph.edges = this.graph.edges.filter(e => this.graph.nodes[e.source] && this.graph.nodes[e.target]);
    }

    // Debounced Write
    if (this.saveTimeout) {
        window.clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
        try {
            localStorage.setItem(LANTERN_KEY, JSON.stringify(this.graph));
            // Dispatch event for visualizer
            window.dispatchEvent(new Event('lantern-graph-updated'));
        } catch (e) {
            console.error("Lantern: Storage Quota Exceeded. Graph not saved.");
        }
    }, SAVE_DEBOUNCE_MS);
  }

  public getGraph(): LanternGraph {
      return this.graph;
  }

  /**
   * Inject Event: The "Flame" daemon logic.
   * Converts a user interaction into graph nodes and edges.
   */
  public ingest(content: string, type: LanternNodeType, contextEmotion: Emotion) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const node: LanternNode = {
        id,
        type,
        content,
        timestamp: Date.now()
    };

    // 1. Add Node
    this.graph.nodes[id] = node;

    // 2. Link to Emotion (Proprioceptive Context)
    // Find or create emotion node
    let emotionId = Object.keys(this.graph.nodes).find(k => this.graph.nodes[k].type === 'emotion' && this.graph.nodes[k].content === contextEmotion);
    if (!emotionId) {
        emotionId = `emo_${contextEmotion}`;
        this.graph.nodes[emotionId] = {
            id: emotionId,
            type: 'emotion',
            content: contextEmotion,
            timestamp: Date.now()
        };
    }

    // Create Edge: Event --[emotional]--> Emotion
    this.createEdge(id, emotionId, 1.0, 'emotional');

    // 3. Link to recent nodes (Temporal Association)
    // Get last 3 nodes added
    const recentNodes = Object.values(this.graph.nodes)
        .filter(n => n.id !== id && n.id !== emotionId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);

    recentNodes.forEach((prevNode, index) => {
        // Closer in time = higher initial weight
        const weight = 0.8 - (index * 0.2); 
        this.createEdge(prevNode.id, id, weight, 'temporal');
    });

    this.saveGraph();
    return id;
  }

  private createEdge(source: string, target: string, weight: number, type: LanternEdge['type']) {
      // Check if edge exists
      const existing = this.graph.edges.find(e => 
          (e.source === source && e.target === target) || 
          (e.source === target && e.target === source) // Undirected for simple association
      );

      if (existing) {
          // Reinforce
          existing.weight = Math.min(1.0, existing.weight + 0.1);
          existing.lastReinforced = Date.now();
      } else {
          this.graph.edges.push({
              source,
              target,
              weight,
              type,
              createdAt: Date.now(),
              lastReinforced: Date.now()
          });
      }
  }

  /**
   * Proprioceptive Recall:
   * Returns a subgraph of relevant nodes based on the current context.
   */
  public recall(currentInput: string, currentEmotion: Emotion): string {
      // 1. Apply Time Decay to weights
      const now = Date.now();
      const msPerDay = 86400000;
      
      this.graph.edges.forEach(e => {
          const daysSince = (now - e.lastReinforced) / msPerDay;
          e.weight = Math.max(0.1, e.weight - (daysSince * DECAY_RATE));
      });

      // 2. Find Entry Points
      // (Simplistic keyword matching for this demo version)
      const tokens = currentInput.toLowerCase().split(' ').filter(t => t.length > 4);
      const entryPoints = Object.values(this.graph.nodes).filter(n => {
          if (n.type === 'emotion' && n.content === currentEmotion) return true;
          return tokens.some(t => n.content.toLowerCase().includes(t));
      });

      // 3. Traverse Edges (1-hop depth) to gather context
      const contextSet = new Set<string>();
      
      entryPoints.forEach(entry => {
          contextSet.add(`[${entry.type.toUpperCase()}: ${entry.content}]`);
          
          // Find connected nodes with high weight
          const relevantEdges = this.graph.edges.filter(e => 
              (e.source === entry.id || e.target === entry.id) && e.weight > 0.4
          );

          relevantEdges.forEach(e => {
              const otherId = e.source === entry.id ? e.target : e.source;
              const other = this.graph.nodes[otherId];
              if (other) {
                  contextSet.add(`- Linked Context (${e.type}): ${other.content}`);
              }
          });
      });

      return Array.from(contextSet).join('\n');
  }
}

export const lanternService = new LanternService();
