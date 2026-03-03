import { Composition, Folder } from 'remotion';
import { DashboardVideo } from './videos/DashboardVideo';
import { PickingVideo } from './videos/PickingVideo';
import { PackingVideo } from './videos/PackingVideo';
import { InwardsGoodsVideo } from './videos/InwardsGoodsVideo';
import { InventoryVideo } from './videos/InventoryVideo';
import { ShippingVideo } from './videos/ShippingVideo';
import { ReportsVideo } from './videos/ReportsVideo';
import { AccountingVideo } from './videos/AccountingVideo';
import { HRVideo } from './videos/HRVideo';
import { ManufacturingVideo } from './videos/ManufacturingVideo';
import { TaskExecutionVideo } from './videos/TaskExecutionVideo';

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="WMS-Modules">
        <Composition
          id="Dashboard"
          component={DashboardVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Picking"
          component={PickingVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Packing"
          component={PackingVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="InwardsGoods"
          component={InwardsGoodsVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Inventory"
          component={InventoryVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Shipping"
          component={ShippingVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Reports"
          component={ReportsVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Accounting"
          component={AccountingVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="HR"
          component={HRVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Manufacturing"
          component={ManufacturingVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="TaskExecution"
          component={TaskExecutionVideo}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
