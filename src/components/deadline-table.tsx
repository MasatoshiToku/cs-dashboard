"use client";

import { useState } from "react";
import type { DeadlineAlert } from "@/lib/types";
import { URGENCY_BADGE_VARIANT, URGENCY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TabKey = "all" | "overdue" | "today" | "soon-3d" | "soon-7d";

const TAB_ITEMS: { value: TabKey; label: string }[] = [
  { value: "all", label: "全件" },
  { value: "overdue", label: "超過" },
  { value: "today", label: "本日" },
  { value: "soon-3d", label: "3日以内" },
  { value: "soon-7d", label: "1週間以内" },
];

function filterByTab(alerts: DeadlineAlert[], tab: TabKey): DeadlineAlert[] {
  if (tab === "all") return alerts;
  return alerts.filter((a) => a.urgency === tab);
}

function AlertTable({ rows }: { rows: DeadlineAlert[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        該当するアラートはありません
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">課題キー</TableHead>
          <TableHead>概要</TableHead>
          <TableHead className="w-[120px]">VC名</TableHead>
          <TableHead className="w-[100px]">担当者</TableHead>
          <TableHead className="w-[110px]">期日</TableHead>
          <TableHead className="w-[100px]">ステータス</TableHead>
          <TableHead className="w-[100px] text-right">残日数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((alert) => (
          <TableRow key={alert.issueKey}>
            <TableCell className="font-mono text-xs">
              {alert.issueKey}
            </TableCell>
            <TableCell>{alert.summary}</TableCell>
            <TableCell>{alert.vcName}</TableCell>
            <TableCell>{alert.assignee}</TableCell>
            <TableCell>{formatDate(alert.deadlineFinal)}</TableCell>
            <TableCell>{alert.statusGroup}</TableCell>
            <TableCell className="text-right">
              <Badge
                variant={
                  URGENCY_BADGE_VARIANT[alert.urgency] ?? "outline"
                }
              >
                {alert.daysUntilDeadline < 0
                  ? `${Math.abs(alert.daysUntilDeadline)}日超過`
                  : alert.daysUntilDeadline === 0
                    ? URGENCY_LABELS[alert.urgency]
                    : `${alert.daysUntilDeadline}日`}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DeadlineTable({ alerts }: { alerts: DeadlineAlert[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const filtered = filterByTab(alerts, tab);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as TabKey)}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <TabsList>
          {TAB_ITEMS.map((item) => {
            const count =
              item.value === "all"
                ? alerts.length
                : alerts.filter((a) => a.urgency === item.value).length;
            return (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {TAB_ITEMS.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          <AlertTable rows={filtered} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
