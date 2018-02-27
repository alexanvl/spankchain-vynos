import * as React from "react";
import * as T from '../../components/Table/index';
import * as classnames from 'classnames';

const s = require("./styles.css");

class ActivitySubpage extends React.Component<any, any> {
  constructor (props: any) {
    super(props)
  }

  render() {
    return (
      <div className={s.walletActivityWrapper}>
        <div className={s.walletActivityHeaderRow}>
          <div className={s.walletActivityHeader}>Activity</div>
          <div className={s.walletAmountWrapper}>
            <div className={s.walletAmount}>$69</div>
            <div className={s.walletEqual}>=</div>
            <div className={s.walletConverted}>0.09 ETH</div>
          </div>
        </div>
        <T.Table className={s.walletActivityTable}>
          <T.TableHeader className={s.walletActivityTableHeader}>
            <T.TableRow>
              <T.TableHeaderCell className={classnames(s.walletActivityHeaderCell, s.walletActivityDate)}>Date</T.TableHeaderCell>
              <T.TableHeaderCell className={classnames(s.walletActivityHeaderCell, s.walletActivityTime)}>Time</T.TableHeaderCell>
              <T.TableHeaderCell className={s.walletActivityHeaderCell}>Item</T.TableHeaderCell>
              <T.TableHeaderCell></T.TableHeaderCell>
              <T.TableHeaderCell></T.TableHeaderCell>
            </T.TableRow>
          </T.TableHeader>
          <T.TableBody>
            <T.TableRow className={s.walletActivityEntry}>
              <T.TableCell className={s.walletActivityDate}>
                <div className={s.walletActivityMonth}>Jan</div>
                <div className={s.walletActivityDay}>16</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityTime}>
                <div className={s.walletActivityStart}>7:15pm</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityItemDescription}>
                <div className={s.walletActivityItem}>SpankCam</div>
                <div className={s.walletActivityDescription}>Butter Bubble</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityPrice}>
                <div className={s.walletActivitySubtract}>-</div>
                <div className={s.walletActivitySubtractAmount}>$23</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityAction}>
                <div className={s.walletActivityMore}>...</div>
              </T.TableCell>
            </T.TableRow>

            <T.TableRow className={s.walletActivityEntry}>
              <T.TableCell className={s.walletActivityDate}>
                <div className={s.walletActivityMonth}>Jan</div>
                <div className={s.walletActivityDay}>15</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityTime}>
                <div className={s.walletActivityStart}>5:12pm</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityItemDescription}>
                <div className={s.walletActivityItem}>Received</div>
                <div className={s.walletActivityDescription}>0xD7448…9635</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityPrice}>
                <div className={s.walletActivityReceiveAmount}>+10.07636301</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityAction}>
                <div className={s.walletActivityMore}>...</div>
              </T.TableCell>
            </T.TableRow>

            <T.TableRow className={classnames(s.walletActivityEntry, s.selected)}>
              <T.TableCell className={s.walletActivityDate}>
                <div className={s.walletActivityMonth}>Jan</div>
                <div className={s.walletActivityDay}>14</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityTime}>
                <div className={s.walletActivityStart}>7:15-</div>
                <div className={s.walletActivityEnd}>7:15pm</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityItemDescription}>
                <div className={s.walletActivityItem}>Sent</div>
                <div className={s.walletActivityDescription}>0xD7448…9635</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityPrice}>
                <div className={s.walletActivitySendAmount}>–2.04586785</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityAction}>
                <div className={s.walletActivityLess}>x</div>
              </T.TableCell>
            </T.TableRow>

            <T.TableRow className={classnames(s.walletActivityDetails, s.selected, s.first)}>
              <T.TableCell className={s.walletActivityDate} />
              <T.TableCell className={s.walletActivityTime}>
                <div className={s.walletActivityStart}>7:15pm</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityItemDescription}>
                <div className={s.walletActivityItem}>Spank</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityPrice}>
                <div className={s.walletActivitySubtract}>-</div>
                <div className={s.walletActivitySubtractAmount}>$23</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityAction}/>
            </T.TableRow>
            <T.TableRow className={classnames(s.walletActivityDetails, s.selected)}>
              <T.TableCell className={s.walletActivityDate} />
              <T.TableCell className={s.walletActivityTime}>
                <div className={s.walletActivityStart}>7:15pm</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityItemDescription}>
                <div className={s.walletActivityItem}>Spank</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityPrice}>
                <div className={s.walletActivitySubtract}>-</div>
                <div className={s.walletActivitySubtractAmount}>$23</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityAction}/>
            </T.TableRow>
            <T.TableRow className={classnames(s.walletActivityDetails, s.selected, s.last)}>
              <T.TableCell className={s.walletActivityDate} />
              <T.TableCell className={s.walletActivityTime}>
                <div className={s.walletActivityStart}>7:15pm</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityItemDescription}>
                <div className={s.walletActivityItem}>Spank</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityPrice}>
                <div className={s.walletActivitySubtract}>-</div>
                <div className={s.walletActivitySubtractAmount}>$23</div>
              </T.TableCell>
              <T.TableCell className={s.walletActivityAction}/>
            </T.TableRow>

          </T.TableBody>
        </T.Table>
      </div>
    )
  }
}

export default ActivitySubpage;
