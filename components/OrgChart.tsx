import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { OrgNode } from '../types';

interface OrgChartProps {
  data: OrgNode;
}

const OrgChart: React.FC<OrgChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: Math.max(600, entries[0].contentRect.height)
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 40, right: 90, bottom: 50, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);

    // Create hierarchy
    const root = d3.hierarchy<OrgNode>(data);
    
    // Tree layout
    const treeLayout = d3.tree<OrgNode>()
      .size([innerHeight, innerWidth]);

    treeLayout(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x) as any
      );

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d) => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d) => d.data.role === 'root' ? '#3b82f6' : '#cbd5e1')
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dy", 3)
      .attr("x", (d) => d.children ? -10 : 10)
      .style("text-anchor", (d) => d.children ? "end" : "start")
      .text((d) => d.data.name)
      .attr("fill", "#f1f5f9")
      .attr("font-size", "12px")
      .attr("font-weight", (d) => d.data.role === 'root' ? "bold" : "normal")
      .clone(true).lower()
      .attr("stroke", "#0f172a") // text outline for readability
      .attr("stroke-width", 3);
      
    // Role Label (subtitle)
    node.append("text")
        .attr("dy", 18)
        .attr("x", (d) => d.children ? -10 : 10)
        .style("text-anchor", (d) => d.children ? "end" : "start")
        .text((d) => d.data.role)
        .attr("fill", "#94a3b8")
        .attr("font-size", "10px");


  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800 relative cursor-move">
      <div className="absolute top-2 right-2 text-xs text-slate-500 pointer-events-none">
        Scroll to zoom • Drag to pan
      </div>
      <svg ref={svgRef} className="block w-full h-full"></svg>
    </div>
  );
};

export default OrgChart;
