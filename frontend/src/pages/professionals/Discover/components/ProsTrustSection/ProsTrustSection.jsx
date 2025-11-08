import TrustImage from '../../../../../assets/images/DiscoverPros/SoundBetter.jpg';
import { Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import styles from './ProsTrustSection.module.css';

const { Title, Paragraph } = Typography;

export default function ProsTrustSection() {
  const title = 'Over 400,000 musicians have used and trust SoundBetter';
  const bullets = [
    {
      title: 'Safe and secure',
      body: "Fund a project to get started and release payment once it's completed",
    },
    {
      title: 'Protect your copyright',
      body: 'Our software provides a record of exchanges and files for future reference',
    },
    {
      title: 'Human support',
      body: 'Email, phone and chat to help you with your projects',
    },
    {
      title: 'Simply the best talent',
      body: 'Pros work for their reviews and will give you their best',
    },
    {
      title: 'Level up',
      body: 'Better sounding content gets more plays, bookings and placement',
    },
  ];

  const mid = Math.ceil(bullets.length / 2);
  const leftCol = bullets.slice(0, mid);
  const rightCol = bullets.slice(mid);

  return (
    <section className={styles.wrap}>
      <div>
        <div className="row align-items-center">
          {/* IMAGE (LEFT) */}
          <div className="col-12 col-lg-6">
            <div className={styles.imageBox}>
              <img
                src={TrustImage}
                alt="Trust illustration"
                className={styles.img}
              />
              <div className={styles.slant} />
            </div>
          </div>

          {/* TEXT (RIGHT) */}
          <div className="col-12 col-lg-6">
            <div className={styles.textBox}>
              <Title level={2} className={styles.title}>
                {title}
              </Title>

              <div className="row">
                <div className="col-12 col-md-6">
                  {leftCol.map((item, idx) => (
                    <div key={idx} className={styles.bullet}>
                      <CheckCircleFilled className={styles.icon} />
                      <div>
                        <div className={styles.bulletTitle}>{item.title}</div>
                        <Paragraph className={styles.bulletBody}>
                          {item.body}
                        </Paragraph>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="col-12 col-md-6">
                  {rightCol.map((item, idx) => (
                    <div key={idx} className={styles.bullet}>
                      <CheckCircleFilled className={styles.icon} />
                      <div>
                        <div className={styles.bulletTitle}>{item.title}</div>
                        <Paragraph className={styles.bulletBody}>
                          {item.body}
                        </Paragraph>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* row */}
      </div>
      {/* container */}
    </section>
  );
}
