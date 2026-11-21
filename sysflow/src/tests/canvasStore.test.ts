import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore, engine } from '../store/canvasStore';

describe('SysFlow Canvas Store (Phase 2)', () => {
  beforeEach(() => {
    useCanvasStore.getState().resetSimulation();
  });

  it('initializes with a blank canvas (user designs their own topology)', () => {
    const { nodes, edges } = useCanvasStore.getState();
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it('adds a component node to the blank canvas', () => {
    const { addNode, nodes } = useCanvasStore.getState();
    addNode('client', { x: 100, y: 100 });
    const updated = useCanvasStore.getState();
    expect(updated.nodes.length).toBe(1);
    expect(updated.nodes[0].data.type).toBe('client');
    expect(updated.nodes[0].data.label).toBe('Users / Clients');
  });

  it('can add an edge and delete it', () => {
    const { addNode, nodes } = useCanvasStore.getState();
    addNode('client', { x: 100, y: 100 });
    addNode('app-server', { x: 400, y: 100 });
    const updated = useCanvasStore.getState();
    const client = updated.nodes.find((n) => n.data.type === 'client');
    const server = updated.nodes.find((n) => n.data.type === 'app-server');
    expect(client).toBeDefined();
    expect(server).toBeDefined();

    // Manually add an edge between them
    const { edges, deleteEdge } = useCanvasStore.getState();
    const testEdge = { id: 'test-edge-1', source: client!.id, target: server!.id, type: 'removableEdge' };
    useCanvasStore.setState({ edges: [...edges, testEdge] });

    const withEdge = useCanvasStore.getState();
    expect(withEdge.edges.length).toBe(1);

    deleteEdge('test-edge-1');
    const after = useCanvasStore.getState();
    expect(after.edges.length).toBe(0);
  });

  it('triggers a single request probe when a client node exists', () => {
    const { addNode, triggerSingleRequest, stepSimulation } = useCanvasStore.getState();
    addNode('client', { x: 100, y: 100 });
    addNode('app-server', { x: 400, y: 100 });
    const store = useCanvasStore.getState();
    const client = store.nodes.find((n) => n.data.type === 'client');
    const server = store.nodes.find((n) => n.data.type === 'app-server');
    useCanvasStore.setState({
      edges: [...store.edges, { id: 'e1', source: client!.id, target: server!.id, type: 'removableEdge' }]
    });

    triggerSingleRequest();
    engine.clock.step(2000);
    stepSimulation();
    const updated = useCanvasStore.getState();
    expect(updated.globalMetrics.totalRequests).toBe(1);
    expect(updated.isPlaying).toBe(true);
  });

  it('correctly kills a node (SIGTERM / Chaos simulation)', () => {
    const { addNode, killNode } = useCanvasStore.getState();
    addNode('app-server', { x: 100, y: 100 });
    const serverId = useCanvasStore.getState().nodes[0].id;
    killNode(serverId);

    const updated = useCanvasStore.getState();
    const server = updated.nodes.find((n) => n.id === serverId);
    expect(server?.data.status).toBe('dead');
    expect(server?.data.metrics.cpuUsage).toBe(0);
    expect(server?.data.metrics.errorRate).toBe(1.0);
  });

  it('deletes selected node and cleans up connected edges', () => {
    const { addNode, setSelectedNodeId, deleteSelectedNode } = useCanvasStore.getState();
    addNode('load-balancer', { x: 100, y: 100 });
    addNode('app-server', { x: 400, y: 100 });
    const store = useCanvasStore.getState();
    const lb = store.nodes.find((n) => n.data.type === 'load-balancer');
    const server = store.nodes.find((n) => n.data.type === 'app-server');
    useCanvasStore.setState({
      edges: [...store.edges, { id: 'e1', source: lb!.id, target: server!.id, type: 'removableEdge' }]
    });

    setSelectedNodeId(lb!.id);
    deleteSelectedNode();
    const updated = useCanvasStore.getState();
    expect(updated.nodes.find((n) => n.id === lb!.id)).toBeUndefined();
    expect(updated.edges.filter((e) => e.source === lb!.id || e.target === lb!.id).length).toBe(0);
  });
});
