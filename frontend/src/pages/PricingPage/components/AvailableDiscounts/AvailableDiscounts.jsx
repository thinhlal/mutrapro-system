// src/pages/PricingPage/components/AvailableDiscounts/AvailableDiscounts.jsx
import { memo } from "react";
import { Container } from "react-bootstrap";
import styles from "./AvailableDiscounts.module.css";

import Regularcustomers from "../../../../assets/images/PricingPage/AvailableDiscounts/Regularcustomers.png";
import Bringafriend from "../../../../assets/images/PricingPage/AvailableDiscounts/Bringafriend.png";
import Bulkorders from "../../../../assets/images/PricingPage/AvailableDiscounts/Bulkorders.png";
import Musicbusinesses from "../../../../assets/images/PricingPage/AvailableDiscounts/Musicbusinesses.png";
import Musicartists from "../../../../assets/images/PricingPage/AvailableDiscounts/Musicartists.png";

const ITEMS = [
    {
        icon: Regularcustomers,
        title: "Regular customers",
        desc: <>Get <strong>special deals</strong> as a returning customer</>,
        alt: "Regular customers icon",
    },
    {
        icon: Bulkorders,
        title: "Bulk orders",
        desc: <>5–20% discounts for bulk orders and large song batches</>,
        alt: "Bulk orders icon",
    },
    {
        icon: Bringafriend,
        title: "Bring a friend",
        desc: <>5% off for you and your friend</>,
        alt: "Bring a friend icon",
    },
    {
        icon: Musicbusinesses,
        title: "Music businesses",
        desc: <><strong>B2B</strong> custom pricing and solutions</>,
        alt: "Music businesses icon",
    },
    {
        icon: Musicartists,
        title: "Music artists",
        desc: <>Explore <strong>partnership</strong> options with us</>,
        alt: "Music artists icon",
    },
];

const AvailableDiscounts = () => {
    return (
        <section className={styles.section} aria-labelledby="available-discounts">
            <Container className={styles.container}>
                <div className={styles.header}>
                    <h2 id="available-discounts" className={styles.title}>
                        Available discounts
                    </h2>
                    <span className={styles.rule} aria-hidden="true" />
                </div>

                <div className={styles.grid}>
                    {ITEMS.map((item) => (
                        <div className={styles.item} key={item.title}>
                            <div className={styles.iconWrap}>
                                <img className={styles.icon} src={item.icon} alt={item.alt} />
                            </div>
                            <h3 className={styles.itemTitle}>{item.title}</h3>
                            <p className={styles.desc}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}

export default memo(AvailableDiscounts);
