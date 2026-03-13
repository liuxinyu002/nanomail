import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  type Relation
} from 'typeorm'
import { Email } from './Email.entity'

export type TodoUrgency = 'high' | 'medium' | 'low'
export type TodoStatus = 'pending' | 'in_progress' | 'completed'

@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'integer' })
  emailId!: number

  @ManyToOne(() => Email, (email) => email.todos)
  email!: Relation<Email>

  @Column({ type: 'text' })
  description!: string

  @Column({
    type: 'text',
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  })
  urgency!: TodoUrgency

  @Column({
    type: 'text',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  })
  status!: TodoStatus

  /**
   * Deadline for the todo item
   * Stored as UTC datetime (with Z suffix) to ensure timezone consistency
   * Set from LLM-extracted deadline in YYYY-MM-DD format, converted to end of day UTC
   */
  @Column({ type: 'datetime', nullable: true })
  deadline!: Date | null

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}