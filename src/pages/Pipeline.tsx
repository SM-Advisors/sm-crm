import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SalesPipelinePage, { ACTIVE_SALES_STAGES, ARCHIVED_SALES_STAGES } from "./SalesPipeline";
import DeliveryPipelinePage from "./DeliveryPipeline";

export default function PipelinePage() {
  const [tab, setTab] = useState("sales");

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col">
      <div className="px-6 pt-6">
        <TabsList>
          <TabsTrigger value="sales">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Pipeline</TabsTrigger>
          <TabsTrigger value="archived">Archived Pipeline</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sales" className="mt-0">
        <SalesPipelinePage stages={ACTIVE_SALES_STAGES} />
      </TabsContent>
      <TabsContent value="delivery" className="mt-0">
        <DeliveryPipelinePage />
      </TabsContent>
      <TabsContent value="archived" className="mt-0">
        <SalesPipelinePage stages={ARCHIVED_SALES_STAGES} />
      </TabsContent>
    </Tabs>
  );
}
